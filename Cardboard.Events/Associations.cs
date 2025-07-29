using Cardboard.Repositories;

namespace Cardboard.Events;

public interface IAssociationEventService
{
	IObservable<AssociationChangedEvent> OnActiveAssociationChanged { get; }
}

public readonly record struct AssociationChangedEvent(
	IReadOnlyCollection<ApplicationAssociation> Associations
)
{
	public override string ToString() =>
		$"{nameof(AssociationChangedEvent)}: {{ {nameof(Associations)}: [{Associations.Count}] }}";
}
