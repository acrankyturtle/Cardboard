namespace Cardboard.Events;

public interface IApplicationEventService
{
	IObservable<ApplicationChangedEvent> OnApplicationChanged { get; }
}

public readonly record struct ApplicationChangedEvent(string Path);
