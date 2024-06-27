namespace Cardboard.Controller;

public class Worker(ILogger<Worker> logger) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		while (!stoppingToken.IsCancellationRequested) { }
	}
}
