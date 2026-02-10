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
		Result<TSuccess, TError>? lastResult = null;

		while (true)
		{
			stopwatch.Restart();

			Result<TSuccess, TError> result;
			try
			{
				result = await func();
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				// Function was cancelled - return last result or a failed result
				if (lastResult.HasValue)
					return lastResult.Value;
				throw;
			}

			lastResult = result;

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
