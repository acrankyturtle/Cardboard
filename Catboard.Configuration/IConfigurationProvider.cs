using Cranky.Events;

namespace Catboard.Configuration;

public interface IConfigurationProvider<T>
{
	IReadOnlyObservableProperty<T> Property { get; }

	Task Modify(Func<T, T> modifyFunc);

	T Value => Property.Value;
}

public static class Extensions_IConfigurationProvider
{
	public static Task Set<T>(this IConfigurationProvider<T> provider, T value) =>
		provider.Modify(_ => value);
}
