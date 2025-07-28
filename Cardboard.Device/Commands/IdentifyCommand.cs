using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class IdentityCommand : ICommand<Unit, DeviceInfo>
{
	private static readonly CommandId _id = CommandId.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");
	public CommandId Id => _id;

	public DeviceInfo Execute(Unit input, ICommandStream stream)
	{
		var length = stream.Reader.ReadUInt16();
		var bytes = stream.Reader.ReadBytes(length);
		var response =
			JsonSerializer.Deserialize<IdentifyResponse>(bytes, DeviceJson.SerializerOptions)
			?? throw new JsonException();
		return response.Info;
	}

	private class IdentifyResponse
	{
		public required DeviceInfo Info { get; init; }
	}
}
