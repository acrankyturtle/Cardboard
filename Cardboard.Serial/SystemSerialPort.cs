using System.IO.Ports;
using System.Runtime.Serialization;
using Cardboard.Device;
using Cranky;

namespace Cardboard.Serial;

internal sealed class SystemSerialPort(SerialPort serialPort) : ISerialPort, IDisposable
{
	private static readonly TimeSpan timeOut = TimeSpan.FromSeconds(1);

	private readonly SemaphoreSlim _lock = new(1, 1);

	private static readonly ReadOnlyMemory<byte> _deviceIdentityCmdId = new byte[] { 0x00 };

	// public bool IsBusy => _lock.CurrentCount < 1;

	public bool IsOpen => serialPort.IsOpen;

	public static Result<SystemSerialPort, Exception> Create(string portName)
	{
		var serialPort = new SerialPort(portName)
		{
			BaudRate = 115200,
			DtrEnable = true, // required for CircuitPython data serial connections... todo: is this required with Rust?
			Handshake = Handshake.None,
			ReadTimeout = 1000,
			WriteTimeout = 100,
		};

		try
		{
			serialPort.Open();
		}
		catch (Exception ex)
		{
			return Result.Fail(ex);
		}

		return new SystemSerialPort(serialPort);
	}

	public async Task<Result<T>> SendWithResponse<T>(
		ReadOnlyMemory<byte> msg,
		DeserializeFunc<T> deserializeResponse,
		CancellationToken cancellationToken = default
	)
	{
		await _lock.WaitAsync(cancellationToken);

		try
		{
			var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
			linkedCts.CancelAfter(timeOut);

			serialPort.BaseStream.Write(msg.Span);

			try
			{
				return await Read(deserializeResponse, linkedCts.Token);
			}
			catch (OperationCanceledException)
			{
				return Result.Fail();
			}
		}
		finally
		{
			_lock.Release();
		}
	}

	public async Task Send(ReadOnlyMemory<byte> msg, CancellationToken cancellationToken = default)
	{
		await _lock.WaitAsync(cancellationToken);

		try
		{
			serialPort.BaseStream.Write(msg.Span);
		}
		finally
		{
			_lock.Release();
		}
	}

	public async Task<Result<DeviceInfo>> GetDeviceInfo(CancellationToken cancellationToken = default) =>
		(
			await SendWithResponse<DeviceIdentityResponse>(
				_deviceIdentityCmdId,
				m =>
				{
					var span = m.Span;
					return BinaryHelpers.ReadJson<DeviceIdentityResponse>(ref span);
				},
				cancellationToken
			)
		).Select(x => x.Info);

	public void Dispose()
	{
		serialPort.Close();
	}

	// we only expect to call this while lock is held
	private async Task<Result<T>> Read<T>(
		DeserializeFunc<T> deserialize,
		CancellationToken cancellationToken = default
	)
	{
		using var reader = serialPort.BaseStream.CreateDeviceReader(true);
		using var semaphore = new SemaphoreSlim(0);

		if (serialPort.BytesToRead < 1)
		{
			serialPort.DataReceived += OnDataReceived;
			try
			{
				await semaphore.WaitAsync(cancellationToken);
			}
			finally
			{
				serialPort.DataReceived -= OnDataReceived;
			}
		}

		if (!serialPort.IsOpen)
			return Result.Fail();

		var bytesAvailable = serialPort.BytesToRead;

		using var memory = ReadMessageData(reader);

		if (memory is null)
			return Result.Fail();

		var buffer = memory.Value.Data;

		var deserialized = deserialize(buffer);
		return Result.Success(deserialized);

		static RentedMemory? ReadMessageData(BinaryReader reader)
		{
			try
			{
				var numBytes = reader.ReadInt32();

				var rented = RentedMemory.Rent(numBytes);
				var buffer = rented.Data[..numBytes];
				// var numBytesRead = reader.Read(buffer.Span);

				reader.BaseStream.ReadExactly(buffer.Span);
				// if (numBytes != numBytesRead)
				// {
				// 	// TODO: log
				// 	rented.Dispose();
				// 	return null;
				// }

				return rented;
			}
			catch (IOException)
			{
				// TODO: log
			}
			catch (SerializationException)
			{
				// TODO: log
			}

			return null;
		}

		// ReSharper disable once AccessToDisposedClosure
		void OnDataReceived(object sender, SerialDataReceivedEventArgs e) => semaphore.Release();
	}
}

public class DeviceIdentityResponse
{
	public required DeviceInfo Info { get; init; }
}
