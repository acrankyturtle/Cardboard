using System.Reactive.Subjects;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace Cardboard.Utilities;

public class AsyncDispatchSubject<T> : ISubject<T>, IDisposable
{
	private readonly Subject<T> _subject = new();
	private readonly CancellationTokenSource _cancellation = new();
	private readonly Task _processingTask;

	private readonly Channel<T> _channel;
	private readonly ILogger? _logger;
	private readonly ChannelWriter<T> _writer;

	public AsyncDispatchSubject(ILogger? logger = null)
		: this(Channel.CreateUnbounded<T>(new() { SingleReader = true, SingleWriter = false }), logger) { }

	public AsyncDispatchSubject(Channel<T> channel, ILogger? logger = null)
	{
		_channel = channel;
		_logger = logger;
		_writer = channel.Writer;
		_processingTask = Task.Run(ProcessChannel);
	}

	public void OnNext(T value)
	{
		if (!_cancellation.Token.IsCancellationRequested)
			_ = Task.Run(async () =>
			{
				await _writer.WriteAsync(value, _cancellation.Token);
			});
	}

	public void OnError(Exception error)
	{
		_writer.Complete(error);
		_subject.OnError(error);
	}

	public void OnCompleted()
	{
		_writer.Complete();
		_subject.OnCompleted();
	}

	public IDisposable Subscribe(IObserver<T> observer)
	{
		return _subject.Subscribe(observer);
	}

	private async Task ProcessChannel()
	{
		try
		{
			await foreach (var item in _channel.Reader.ReadAllAsync(_cancellation.Token))
				try
				{
					_subject.OnNext(item);
				}
				catch (Exception ex)
				{
					if (_logger is not null)
						_logger?.LogError(ex, "Error while processing item in AsyncSubject: {Item}", item);
					else
						Console.WriteLine(
							$"Error while processing item in AsyncSubject: {item}. Exception: {ex}"
						);
				}
		}
		catch (OperationCanceledException) { }
	}

	public void Dispose()
	{
		GC.SuppressFinalize(this);

		_cancellation.Cancel();
		_writer.Complete();

		_ = _processingTask.ContinueWith(_ =>
		{
			_subject.Dispose();
			_cancellation.Dispose();
		});
	}
}
