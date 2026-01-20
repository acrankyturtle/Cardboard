namespace Cardboard.Update.Api;

public class UpdateSourceConfiguration
{
	public required string Url { get; init; }

	public UpdateChannel Channel { get; init; } = UpdateChannel.Stable;
}

[Flags]
public enum UpdateChannel
{
	Stable = 1,
	Preview = 2,
	All = ~0,
}
