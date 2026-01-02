using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Repositories;

public interface ILogSink
{
	void Add(LogEntry entry);
	IReadOnlyList<LogEntry> GetEntries(int? limit = null, DateTimeOffset? since = null);
	void Clear();
}

public sealed class LogEntry
{
	public required DateTimeOffset Timestamp { get; init; }
	public required LogLevel Level { get; init; }
	public required string Category { get; init; }
	public required string Message { get; init; }
	public string? Exception { get; init; }
}

public sealed class MemoryLogSink(int maxEntries = 1000) : ILogSink
{
	private readonly ConcurrentQueue<LogEntry> _entries = new();

	public void Add(LogEntry entry)
	{
		_entries.Enqueue(entry);

		// Trim old entries if we exceed the limit
		while (_entries.Count > maxEntries && _entries.TryDequeue(out _)) { }
	}

	public IReadOnlyList<LogEntry> GetEntries(int? limit = null, DateTimeOffset? since = null)
	{
		var entries = _entries.ToArray().AsEnumerable();

		if (since.HasValue)
		{
			entries = entries.Where(e => e.Timestamp >= since.Value);
		}

		if (limit.HasValue)
		{
			entries = entries.TakeLast(limit.Value);
		}

		return entries.ToList();
	}

	public void Clear()
	{
		_entries.Clear();
	}
}

partial class Services
{
	private static IServiceCollection AddLogSink(this IServiceCollection services)
	{
		services.AddSingleton<ILogSink, MemoryLogSink>();
		return services;
	}
}
