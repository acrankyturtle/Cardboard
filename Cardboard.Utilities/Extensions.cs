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

public static class EnumerableExtensions
{
	public static IEnumerable<T> SelectNotNull<TSource, T>(
		this IEnumerable<TSource> source,
		Func<TSource, T?> selector
	)
		where T : class
	{
		foreach (var item in source)
		{
			if (selector(item) is { } value)
				yield return value;
		}
	}

	public static IEnumerable<T> SelectNotNull<TSource, T>(
		this IEnumerable<TSource> source,
		Func<TSource, T?> selector
	)
		where T : struct
	{
		foreach (var item in source)
		{
			if (selector(item) is { } value)
				yield return value;
		}
	}
}
