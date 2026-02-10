using System.Text.Json;
using Cardboard.Utilities;

namespace Cardboard.Device;

public sealed class IdentityCommand : ICommand<Unit, DeviceInfo>
{
	private static readonly CommandId _id = CommandId.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");
	public CommandId Id => _id;

	public DeviceInfo Execute(Unit input, ICommandStream stream)
	{
		var response = IdentifyResponse.ReadFrom(stream.Reader);
		return response.Info;
	}

	private class IdentifyResponse : IReadable<IdentifyResponse>
	{
		public required DeviceInfo Info { get; init; }

		public static IdentifyResponse ReadFrom(BinaryReader reader)
		{
			var version = reader.ReadUInt32();

			if (version != 1)
				throw new InvalidOperationException($"Unsupported IdentifyResponse version: {version}.");

			var info = DeviceInfo.ReadFrom(reader);
			return new() { Info = info };
		}
	}
}
