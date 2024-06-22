using System.Collections.Concurrent;

namespace Catboard.Serial;

/// <summary>
/// A queue that processes items on a separate thread.
/// </summary>
public class ThreadQueue<T>
{
	private readonly ConcurrentQueue<ThreadQueueItem> _queue = new();
	private readonly SemaphoreSlim _available = new(0);
	private readonly Thread _thread;

	public ThreadQueue(Action<T> process, CancellationToken cancellationToken)
	{
		_thread = new(() =>
		{
			while (!cancellationToken.IsCancellationRequested)
			{
				_available.Wait(cancellationToken);

				if (cancellationToken.IsCancellationRequested)
					break;

				if (!_queue.TryDequeue(out var item))
					continue;

				process(item.Item);
				item.OnProcessed?.Invoke();
			}

			_available.Dispose();
		});

		_thread.Start();
	}

	public void Enqueue(T item, Action? onProcessed = null)
	{
		_queue.Enqueue(new(item, onProcessed));
		_available.Release();
	}

	public Task EnqueueAwait(T item)
	{
		var tcs = new TaskCompletionSource();
		Enqueue(item, tcs.SetResult);
		return tcs.Task;
	}

	private readonly struct ThreadQueueItem(T item, Action? onProcessed)
	{
		public T Item { get; } = item;
		public Action? OnProcessed { get; } = onProcessed;
	}
}
