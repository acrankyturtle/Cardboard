using Cranky;

namespace Cardboard.Utilities;

public static class Polling
{
	public static async Task<Result<TSuccess, TError>> Poll<TSuccess, TError>(
		Func<Task<Result<TSuccess, TError>>> func,
		TimeSpan interval,
		CancellationToken cancellationToken = default
	)
	{
		var stopwatch = System.Diagnostics.Stopwatch.StartNew();

		while (true)
		{
			stopwatch.Restart();
			var result = await func();

			if (result.IsSuccess || cancellationToken.IsCancellationRequested)
				return result;

			var elapsed = stopwatch.Elapsed;
			var remainingDelay = interval - elapsed;

			if (remainingDelay <= TimeSpan.Zero)
				continue;

			try
			{
				await Task.Delay(remainingDelay, cancellationToken);
			}
			catch (OperationCanceledException)
			{
				return result;
			}
		}
	}
}
