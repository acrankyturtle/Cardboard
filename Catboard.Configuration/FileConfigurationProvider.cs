using System.Text.Json;
using Cranky.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Catboard.Configuration;

internal class FileConfigurationProvider<T>(
	FileConfigurationProvider<T>.Parameters parameters,
	IOptions<FileConfigurationOptions> options
) : IConfigurationProvider<T>, IRefreshableFileConfiguration
	where T : new()
{
	public readonly record struct Parameters(string Name);

	public IReadOnlyObservableProperty<T> Property => _value;

	private readonly ObservableProperty<T> _value = new(new());

	public async Task Modify(Func<T, T> modifyFunc)
	{
		var value = modifyFunc(_value.Value);

		try
		{
			await using var fileStream = File.OpenWrite(FileName);
			await JsonSerializer.SerializeAsync(fileStream, value);
		}
		catch (Exception ex) when (ex is JsonException or IOException)
		{
			// todo: log?
#if DEBUG
			throw;
#endif
		}
	}

	public async Task Refresh()
	{
		try
		{
			var fileName = FileName;
			var dir = Path.GetDirectoryName(fileName);

			if (dir is null)
				throw new InvalidOperationException($"Could not get directory of `{fileName}`.");

			if (!Directory.Exists(dir))
				Directory.CreateDirectory(dir);

			await using var fileStream = File.OpenRead(fileName);
			var value =
				JsonSerializer.Deserialize<T>(fileStream)
				?? throw new JsonException("Property cannot be null.");

			await _value.SetWait(value);
		}
		catch (Exception ex) when (ex is JsonException or IOException)
		{
			// todo: log?
#if DEBUG
			throw;
#endif
		}
	}

	private string FileName => Path.Combine(options.Value.Path, $"{parameters.Name}.json");
}

internal interface IRefreshableFileConfiguration
{
	Task Refresh();
}

public static partial class Services
{
	public static IServiceCollection AddFileConfiguration<T>(this IServiceCollection services, string name)
		where T : new() =>
		services.AddSingleton<IConfigurationProvider<T>>(
			sp =>
				ActivatorUtilities.CreateInstance<FileConfigurationProvider<T>>(
					sp,
					new FileConfigurationProvider<T>.Parameters(name)
				)
		);
}
