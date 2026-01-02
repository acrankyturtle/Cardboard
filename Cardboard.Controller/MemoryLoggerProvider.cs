using Cardboard.Repositories;

namespace Cardboard.Controller;

public sealed class MemoryLoggerProvider(ILogSink logSink) : ILoggerProvider
{
	public ILogger CreateLogger(string categoryName) => new MemoryLogger(logSink, categoryName);

	public void Dispose() { }
}

internal sealed class MemoryLogger(ILogSink logSink, string categoryName) : ILogger
{
	public IDisposable? BeginScope<TState>(TState state)
		where TState : notnull => null;

	public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

	public void Log<TState>(
		LogLevel logLevel,
		EventId eventId,
		TState state,
		Exception? exception,
		Func<TState, Exception?, string> formatter
	)
	{
		if (!IsEnabled(logLevel))
			return;

		var entry = new LogEntry
		{
			Timestamp = DateTimeOffset.UtcNow,
			Level = logLevel,
			Category = categoryName,
			Message = formatter(state, exception),
			Exception = exception?.ToString(),
		};

		logSink.Add(entry);
	}
}
