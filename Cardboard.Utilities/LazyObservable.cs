using System.Reactive.Disposables;
using System.Reactive.Linq;

namespace Cardboard.Utilities;

/// <summary>
/// An observable that performs initialization when the first subscriber connects
/// and cleanup when the last subscriber disconnects.
/// </summary>
/// <typeparam name="T">The type of elements in the observable</typeparam>
public class LazyObservable<T> : IObservable<T>, IDisposable
{
	private readonly IObservable<T> _source;
	private readonly Action? _initialize;
	private readonly Action? _cleanup;
	private readonly object _lock = new();

	private int _subscriberCount;
	private bool _isInitialized;
	private bool _disposed;

	/// <summary>
	/// Creates a lazy observable that manages resource lifecycle based on subscriptions.
	/// </summary>
	/// <param name="source">The source observable to wrap</param>
	/// <param name="initialize">Action to perform when the first subscriber connects</param>
	/// <param name="cleanup">Action to perform when the last subscriber disconnects</param>
	public LazyObservable(IObservable<T> source, Action? initialize = null, Action? cleanup = null)
	{
		_source = source ?? throw new ArgumentNullException(nameof(source));
		_initialize = initialize;
		_cleanup = cleanup;
	}

	public IDisposable Subscribe(IObserver<T> observer)
	{
		lock (_lock)
		{
			ObjectDisposedException.ThrowIf(_disposed, this);

			if (_subscriberCount == 0)
				Initialize();
			_subscriberCount++;
		}

		var subscription = SubscribeWeak(observer);

		return Disposable.Create(() =>
		{
			subscription.Dispose();

			lock (_lock)
			{
				if (_disposed)
					return;

				_subscriberCount--;
				if (_subscriberCount == 0)
					Cleanup();
			}
		});
	}

	public IDisposable SubscribeWeak(IObserver<T> observer) => _source.Subscribe(observer);

	private void Initialize()
	{
		if (_isInitialized)
			return;

		try
		{
			_initialize?.Invoke();
			_isInitialized = true;
		}
		catch
		{
			// If initialization fails, we should still allow retry on next subscription
			_isInitialized = false;
			throw;
		}
	}

	private void Cleanup()
	{
		if (!_isInitialized)
			return;

		try
		{
			_cleanup?.Invoke();
		}
		finally
		{
			_isInitialized = false;
		}
	}

	public void Dispose()
	{
		lock (_lock)
		{
			if (_disposed)
				return;

			GC.SuppressFinalize(this);
			_disposed = true;

			if (_subscriberCount > 0)
				Cleanup();
		}
	}
}

/// <summary>
/// Factory class for creating lazy observables.
/// </summary>
public static class LazyObservable
{
	/// <summary>
	/// Creates a lazy observable that manages resource lifecycle based on subscriptions.
	/// </summary>
	public static LazyObservable<T> Lazy<T>(
		this IObservable<T> source,
		Action? initialize = null,
		Action? cleanup = null
	) => new(source, initialize, cleanup);

	/// <summary>
	/// Creates a lazy observable with resource management.
	/// </summary>
	public static IObservable<T> WithResource<T, TResource>(
		Func<TResource> resourceFactory,
		Func<TResource, IObservable<T>> sourceSelector,
		Action<TResource>? cleanup = null
	)
		where TResource : class
	{
		return Observable
			.Defer(() =>
			{
				var resource = resourceFactory();

				var source = sourceSelector(resource);

				return source.Finally(() =>
				{
					if (cleanup != null)
						cleanup(resource);
					else if (resource is IDisposable disposable)
						disposable.Dispose();
				});
			})
			.Publish()
			.RefCount();
	}

	public static IObservable<T> WeakIfLazy<T>(this IObservable<T> maybeLazy) =>
		maybeLazy is LazyObservable<T> lazy ? new WeakObservable<T>(lazy) : maybeLazy;
}

file class WeakObservable<T>(LazyObservable<T> lazy) : IObservable<T>
{
	public IDisposable Subscribe(IObserver<T> observer) => lazy.SubscribeWeak(observer);
}
