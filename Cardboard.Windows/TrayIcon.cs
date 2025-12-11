using System.Drawing.Drawing2D;
using Cardboard.Events;
using Cardboard.FrontendHost;
using Cardboard.Repositories;
using Cardboard.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cardboard.Windows;

partial class Services
{
	public static IServiceCollection AddTrayIcon(this IServiceCollection services)
	{
		return services.AddHostedService<TrayIconService>();
	}
}

file class TrayIconService(
	IWindowsService windowsService,
	IHostApplicationLifetime lifetime,
	IAssociationEventService associationEventService,
	IFrontendService frontendService,
	IReinitializer reinitializer,
	ILogger<TrayIconService> logger
) : IHostedService
{
	private readonly Icon _baseIcon =
		Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application;

	private NotifyIcon _notifyIcon = null!;
	private Icon? _renderedIcon;
	private IDisposable? _subscription;
	private bool _isRefreshing;

	public Task StartAsync(CancellationToken cancellationToken)
	{
		_notifyIcon = windowsService.Invoke(__ =>
		{
			var notifyIcon = new NotifyIcon
			{
				Icon = SystemIcons.Application,
				Text = "Cardboard",
				Visible = true,
			};

			var contextMenu = new ContextMenuStrip();
			contextMenu.Items.Add("Open", null, (_, _) => frontendService.Open());
			contextMenu.Items.Add("Refresh", null, (_, _) => Reinitialize());
			contextMenu.Items.Add("Exit", null, (_, _) => lifetime.StopApplication());

			// force creation of the context menu's native window handle
			// without this, the first right-click on the tray icon may not show the menu
			_ = contextMenu.Handle;

			notifyIcon.ContextMenuStrip = contextMenu;

			return notifyIcon;
		});

		_subscription = associationEventService.OnActiveAssociationChanged.Subscribe(OnTagsChanged);

		return Task.CompletedTask;
	}

	public Task StopAsync(CancellationToken cancellationToken)
	{
		_notifyIcon.Dispose();
		_subscription?.Dispose();
		_subscription = null;

		return Task.CompletedTask;
	}

	private void Reinitialize()
	{
		if (_isRefreshing)
			return;

		_isRefreshing = true;
		_ = reinitializer
			.Reinitialize()
			.ContinueWith(t =>
			{
				try
				{
					if (t.IsCompletedSuccessfully)
					{
						logger.LogInformation("Reinitialization complete.");
					}
					else
					{
						logger.LogError(t.Exception, "Reinitialization failed.");
					}
				}
				finally
				{
					_isRefreshing = false;
				}
			});
	}

	private void OnTagsChanged(AssociationChangedEvent e)
	{
		var emblems = e.Associations.Select(x => x.Data.Emblem).OfType<ApplicationIconEmblem>().ToList();
		SetIcon(emblems);
	}

	private void SetIcon(IReadOnlyCollection<ApplicationIconEmblem> emblems)
	{
		_renderedIcon?.Dispose();
		_renderedIcon = null;

		Icon icon;
		if (emblems.Any())
			icon = _renderedIcon = CreateIcon(_baseIcon, emblems);
		else
			icon = _baseIcon;

		_notifyIcon.Icon = icon;
	}

	private static Icon CreateIcon(Icon baseIcon, IEnumerable<ApplicationIconEmblem> emblems)
	{
		using var newIcon = baseIcon.ToBitmap();
		using var g = Graphics.FromImage(newIcon);

		g.InterpolationMode = InterpolationMode.HighQualityBicubic;
		g.CompositingQuality = CompositingQuality.HighQuality;
		g.SmoothingMode = SmoothingMode.HighQuality;
		g.PixelOffsetMode = PixelOffsetMode.HighQuality;

		var iconSize = new Size(newIcon.Width, newIcon.Height);
		var emblemSize = (int)Math.Round(iconSize.Width * 0.45);

		foreach (var emblem in emblems)
			RenderEmblem(g, iconSize, emblemSize, emblem);

		return Icon.FromHandle(newIcon.GetHicon());
	}

	private static void RenderEmblem(Graphics g, Size iconSize, int emblemSize, ApplicationIconEmblem emblem)
	{
		using var brush = new SolidBrush(emblem.Color);

		var penThickness = emblem.Shape switch
		{
			ApplicationIconEmblemShape.Circle => 4.0f,
			_ => 2.0f,
		};
		using var pen = new Pen(Color.Black, penThickness);

		Point emblemOffset = emblem.Position switch
		{
			ApplicationIconEmblemPosition.TopLeft => new(0, 0),
			ApplicationIconEmblemPosition.TopRight => new(iconSize.Width - emblemSize, 0),
			ApplicationIconEmblemPosition.BottomLeft => new(0, iconSize.Height - emblemSize),
			ApplicationIconEmblemPosition.BottomRight => new(
				iconSize.Width - emblemSize,
				iconSize.Height - emblemSize
			),
			_ => throw new ArgumentOutOfRangeException(nameof(emblem), "Invalid emblem position."),
		};

		var emblemBounds = new Rectangle(emblemOffset.X, emblemOffset.Y, emblemSize, emblemSize);

		using var path = new GraphicsPath();
		switch (emblem.Shape)
		{
			case ApplicationIconEmblemShape.Circle:
				path.AddEllipse(emblemBounds);
				break;
			case ApplicationIconEmblemShape.Square:
				path.AddRectangle(emblemBounds);
				break;
			case ApplicationIconEmblemShape.Triangle:
				// use two points for top in case of even sized emblem. points will overlap if odd
				var halfSize1 = (int)Math.Floor(emblemSize / 2.0);
				var halfSize2 = (int)Math.Ceiling(emblemSize / 2.0);

				path.AddPolygon(
					new[]
					{
						new Point(emblemOffset.X + halfSize1, emblemOffset.Y),
						new Point(emblemOffset.X + halfSize2, emblemOffset.Y),
						new Point(emblemOffset.X + emblemSize, emblemOffset.Y + emblemSize),
						new Point(emblemOffset.X, emblemOffset.Y + emblemSize),
					}
				);
				break;
			default:
				throw new ArgumentOutOfRangeException(nameof(emblem), "Invalid emblem shape.");
		}

		g.DrawPath(pen, path);
		g.FillPath(brush, path);
	}
}
