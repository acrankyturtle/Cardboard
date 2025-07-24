using System.Reactive.Disposables;
using Cardboard.Events;
using Cardboard.Repositories;
using Cardboard.Utilities;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Services;

partial class Services
{
	private static IServiceCollection AddAssociationEvents(this IServiceCollection services)
	{
		return services.AddSingleton<IAssociationEventService, AssociationEventService>();
	}
}

internal class AssociationEventService : IAssociationEventService, IDisposable
{
	private readonly IAssociationRepository _associationRepository;
	private readonly CompositeDisposable _subscriptions;

	private readonly AsyncDispatchSubject<AssociationChangedEvent> _dispatchSubject = new();
	public IObservable<AssociationChangedEvent> OnActiveAssociationChanged => _dispatchSubject;

	private ApplicationChangedEvent? _latest;

	public AssociationEventService(
		IApplicationEventService applicationEventService,
		IAssociationRepository associationRepository
	)
	{
		_associationRepository = associationRepository;
		var appSubscription = applicationEventService.OnApplicationChanged.SubscribeAsync(
			OnUpdateAssociations
		);
		var associationSubscription = associationRepository.OnAssociationsChanged.SubscribeAsync(async _ =>
		{
			if (_latest is { } latest)
				await OnUpdateAssociations(latest);
		});

		_subscriptions = [appSubscription, associationSubscription];
	}

	public void Dispose()
	{
		GC.SuppressFinalize(this);
		_subscriptions.Dispose();
		_dispatchSubject.OnCompleted();
		_dispatchSubject.Dispose();
	}

	private async Task OnUpdateAssociations(ApplicationChangedEvent applicationChangedEvent)
	{
		_latest = applicationChangedEvent;
		var matches = await _associationRepository.GetMatches(applicationChangedEvent.Path);
		_dispatchSubject.OnNext(new(matches));
	}
}
