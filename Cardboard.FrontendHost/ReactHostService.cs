// using System.ComponentModel.DataAnnotations;
// using System.Diagnostics;
// using Microsoft.Extensions.Logging;
// using Microsoft.Extensions.Options;
//
// namespace Cardboard.FrontendHost;
//
// public interface IReactHostService
// {
// 	Task EnsureStartedAsync();
// 	void Stop();
// 	bool IsRunning { get; }
// }
//
// public class ReactHostService : IReactHostService, IDisposable
// {
// 	private Process? _nodeProcess;
// 	private readonly ILogger<ReactHostService> _logger;
// 	private readonly Timer _idleTimer;
// 	private readonly SemaphoreSlim _startLock = new(1, 1);
// 	private readonly ReactHostConfiguration _config;
// 	private bool _disposed;
//
// 	public bool IsRunning => _nodeProcess?.HasExited == false;
//
// 	public ReactHostService(ILogger<ReactHostService> logger, IOptions<ReactHostConfiguration> options)
// 	{
// 		_logger = logger;
// 		_config = options.Value;
// 		_idleTimer = new(_ => Stop(), null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
//
// 		_logger.LogInformation(
// 			"ReactHostService configured with Port: {Port}, IdleTimeout: {IdleTimeout}min",
// 			_config.Port,
// 			_config.IdleTimeoutMinutes
// 		);
// 	}
//
// 	public async Task EnsureStartedAsync()
// 	{
// 		if (IsRunning)
// 		{
// 			RestartIdleTimer();
// 			return;
// 		}
//
// 		await _startLock.WaitAsync();
// 		try
// 		{
// 			if (!IsRunning) // Double-check
// 			{
// 				await StartReactServerAsync();
// 			}
//
// 			RestartIdleTimer();
// 		}
// 		finally
// 		{
// 			_startLock.Release();
// 		}
// 	}
//
// 	private async Task StartReactServerAsync()
// 	{
// 		var reactPath = Path.Combine(AppContext.BaseDirectory, _config.ReactAppPath);
//
// 		// Use bundled Node.js runtime
// 		var nodeExePath = Path.Combine(AppContext.BaseDirectory, _config.NodePath, "node.exe");
//
// 		if (!File.Exists(nodeExePath))
// 		{
// 			throw new FileNotFoundException($"Bundled Node.js runtime not found at: {nodeExePath}");
// 		}
//
// 		if (!Directory.Exists(reactPath))
// 		{
// 			throw new DirectoryNotFoundException($"React app directory not found at: {reactPath}");
// 		}
//
// 		var serverScriptPath = Path.Combine(reactPath, _config.ServerScript);
// 		if (!File.Exists(serverScriptPath))
// 		{
// 			throw new FileNotFoundException($"React server script not found at: {serverScriptPath}");
// 		}
//
// 		_nodeProcess =
// 			Process.Start(
// 				new ProcessStartInfo
// 				{
// 					FileName = nodeExePath,
// 					Arguments = _config.ServerScript,
// 					WorkingDirectory = reactPath,
// 					UseShellExecute = false,
// 					CreateNoWindow = true,
// 					RedirectStandardOutput = true,
// 					RedirectStandardError = true,
// 					Environment = { ["PORT"] = _config.Port.ToString() },
// 				}
// 			) ?? throw new InvalidOperationException("Failed to start React server");
//
// 		// Optional detailed logging
// 		if (_config.EnableDetailedLogging)
// 		{
// 			_ = Task.Run(LogReactServerOutput);
// 		}
//
// 		if (!await WaitForServerHealthy())
// 		{
// 			Stop();
// 			throw new TimeoutException(
// 				$"React server failed to start on port {_config.Port} within {_config.StartupTimeoutSeconds} seconds"
// 			);
// 		}
//
// 		_logger.LogInformation("React server started on port {Port}", _config.Port);
// 	}
//
// 	private async Task<bool> WaitForServerHealthy()
// 	{
// 		using var client = new HttpClient();
// 		client.Timeout = TimeSpan.FromSeconds(2);
// 		var maxAttempts = _config.StartupTimeoutSeconds;
//
// 		for (var attempt = 0; attempt < maxAttempts; attempt++)
// 		{
// 			try
// 			{
// 				var response = await client.GetAsync($"http://localhost:{_config.Port}");
//
// 				if (response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.NotFound)
// 					return true;
// 			}
// 			catch
// 			{
// 				/* Not ready yet */
// 			}
//
// 			await Task.Delay(1000);
// 		}
//
// 		return false;
// 	}
//
// 	private async Task LogReactServerOutput()
// 	{
// 		if (_nodeProcess?.StandardOutput == null)
// 			return;
//
// 		try
// 		{
// 			while (!_nodeProcess.StandardOutput.EndOfStream)
// 			{
// 				var line = await _nodeProcess.StandardOutput.ReadLineAsync();
// 				if (!string.IsNullOrEmpty(line))
// 					_logger.LogInformation("React Server Output: {Output}", line);
// 			}
// 		}
// 		catch (Exception ex)
// 		{
// 			_logger.LogWarning(ex, "Error reading React server output");
// 		}
// 	}
//
// 	private void RestartIdleTimer() =>
// 		_idleTimer.Change(TimeSpan.FromMinutes(_config.IdleTimeoutMinutes), Timeout.InfiniteTimeSpan);
//
// 	public void Stop()
// 	{
// 		if (_nodeProcess?.HasExited == false)
// 		{
// 			_nodeProcess.Kill();
// 			_logger.LogInformation("React server stopped");
// 		}
//
// 		_nodeProcess?.Dispose();
// 		_nodeProcess = null;
// 		_idleTimer.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
// 	}
//
// 	public void Dispose()
// 	{
// 		if (_disposed)
// 			return;
//
// 		Stop();
// 		_idleTimer.Dispose();
// 		_startLock.Dispose();
// 		_disposed = true;
// 	}
// }
//
// public sealed class ReactHostConfiguration
// {
// 	public int Port { get; set; } = 5173;
//
// 	public int IdleTimeoutMinutes { get; set; } = 10;
//
// 	public string ServerScript { get; set; } = "server.js";
//
// 	/// <summary>
// 	/// Path to the React application relative to the application base directory
// 	/// </summary>
// 	public string ReactAppPath { get; set; } = "react-frontend";
//
// 	public string NodePath { get; set; } = "node";
//
// 	/// <summary>
// 	/// Maximum time to wait for the React server to start up
// 	/// </summary>
// 	public int StartupTimeoutSeconds { get; set; } = 30;
//
// 	/// <summary>
// 	/// Whether to enable detailed logging of React server output
// 	/// </summary>
// 	public bool EnableDetailedLogging { get; set; } = false;
// }
