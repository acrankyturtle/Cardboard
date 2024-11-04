// using System.Collections.Concurrent;
//
// namespace Cardboard.Serial;
//
// internal class ResponseTracker
// {
// 	private readonly ConcurrentDictionary<int, TaskCompletionSource<SerialResponse>> _responses = new();
//
// 	public Task<SerialResponse> Track(int id, CancellationToken cancellationToken)
// 	{
// 		if (id < 0)
// 			throw new ArgumentNullException(nameof(id), "Negative ids are not allowed.");
//
// 		var tcs = new TaskCompletionSource<SerialResponse>();
// 		_responses.TryAdd(id, tcs);
// 		cancellationToken.Register(() => Cancel(id));
//
// 		return tcs.Task;
// 	}
//
// 	public void Complete(SerialResponse responseMessage)
// 	{
// 		TryRemove(responseMessage.Token)?.SetResult(responseMessage);
// 	}
//
// 	private void Cancel(int id)
// 	{
// 		TryRemove(id)?.SetCanceled();
// 	}
//
// 	private TaskCompletionSource<SerialResponse>? TryRemove(int id) =>
// 		_responses.TryRemove(id, out var tcs) ? tcs : null;
// }
