using Cardboard.Repositories;

namespace Cardboard.Events;

public interface IAssociationEventService
{
	IObservable<AssociationChangedEvent> OnActiveAssociationChanged { get; }
}

public readonly record struct AssociationChangedEvent(
	IReadOnlyCollection<ApplicationAssociation> Associations
);
