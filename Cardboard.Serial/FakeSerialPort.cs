using Cardboard.Device;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Serial;

internal class FakeSerialPortProvider(ILogger<FakeSerialPortProvider> logger) : ISerialPortProvider
{
	public Task<IReadOnlyCollection<string>> GetPortNames(CancellationToken cancellationToken) =>
		Task.FromResult<IReadOnlyCollection<string>>(new[] { "POOP1" });

	public Task<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>> GetPorts(
		IEnumerable<string> ports,
		CancellationToken cancellationToken
	) =>
		Task.FromResult<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>>(
			ports.Select(p => (p, Result<ISerialPort, Exception>.Success(new FakeSerialPort(logger, p))))
		);
}

internal class FakeSerialPort(ILogger logger, string name) : ISerialPort
{
	public void Dispose() { }

	public string Name => name;

	public async Task<Result<T, Exception?>> With<T>(
		Func<BinaryReader, BinaryWriter, Task<Result<T>>> action,
		bool clearReadBuffer,
		CancellationToken cancellationToken = default
	)
	{
		using var writerBuffer = new MemoryStream();
		await using var fakeStream = new FakeStream(logger, writerBuffer);
		var reader = fakeStream.CreateDeviceReader();
		var writer = fakeStream.CreateDeviceWriter();

		var result = await action(reader, writer);

		return result.Match<Result<T, Exception?>>(
			x => Result.Success(x),
			() => Result.Fail((Exception?)null)
		);
	}

	public bool IsOpen => true;

	public Task<Result<Unit, Exception>> Open(CancellationToken cancellationToken = default) =>
		Task.FromResult<Result<Unit, Exception>>(Result.Success(Unit.Value));

	private class FakeStream(ILogger logger, MemoryStream writeBuffer) : Stream
	{
		private readonly BinaryWriter _writer = new(writeBuffer);
		private int _readPosition;

		private static readonly IdentifyResponse identifyResponse =
			new()
			{
				Info = new()
				{
					Id = DeviceId.Empty,
					Name = "FAKE",
					Manufacturer = "FAKE",
					Commands = [new() { Id = CommandId.Empty, Name = "FAKE" }],
				},
			};

		private class IdentifyResponse
		{
			public required DeviceInfo Info { get; init; }
		}

		public override void Flush() { }

		public override int Read(byte[] buffer, int offset, int count)
		{
			if (writeBuffer.Length == 16 && writeBuffer.ToArray().All(x => x == 0xFF))
			{
				// identify packet super magical special case
				using var response = new MemoryStream();
				using var writer = new BinaryWriter(response);
				writer.Write((ushort)0);
				writer.WriteJson(identifyResponse);
				var bytes = response.ToArray();
				var length = bytes.Length - 2;
				bytes[0] = (byte)length;
				bytes[1] = (byte)(length >> 8);

				Buffer.BlockCopy(bytes, _readPosition, buffer, offset, count);
			}

			logger.LogInformation($"Reading {count} bytes.");
			_readPosition += count;
			return count;
		}

		public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

		public override void SetLength(long value) => throw new NotSupportedException();

		public override void Write(byte[] buffer, int offset, int count)
		{
			_writer.BaseStream.Write(buffer, offset, count);
			logger.LogInformation($"Writing {count} bytes.");
		}

		public override bool CanRead => true;
		public override bool CanSeek => false;
		public override bool CanWrite => true;
		public override long Length => throw new NotSupportedException();
		public override long Position
		{
			get => throw new NotSupportedException();
			set => throw new NotSupportedException();
		}
	}
}

static partial class Services
{
	private static IServiceCollection AddFakeSerialPortProvider(this IServiceCollection services) =>
		services.AddSingleton<ISerialPortProvider, FakeSerialPortProvider>();
}
