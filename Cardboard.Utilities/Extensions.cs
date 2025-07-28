using System.Reactive.Linq;
using System.Reactive.Threading.Tasks;

namespace Cardboard.Utilities;

public static class EventExtensions
{
	public static IDisposable SubscribeAsync<T>(this IObservable<T> source, Func<T, Task> onNext)
	{
		return source.Select(e => Observable.Defer(() => onNext(e).ToObservable())).Concat().Subscribe();
	}

	// public static IObservable<TOut> SelectAsync<TIn, TOut>(
	// 	this IObservable<TIn> source,
	// 	Func<TIn, Task<TOut>> selector
	// )
	// {
	// 	return source.Select(e => Observable.Defer(() => selector(e).ToObservable())).Concat();
	// }
}
