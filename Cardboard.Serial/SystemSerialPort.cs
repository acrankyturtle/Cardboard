using System.IO.Ports;
using Cardboard.Device;
using Cranky;

namespace Cardboard.Serial;

internal sealed class SystemSerialPort(string name, SerialPort serialPort) : ISerialPort
{
	private static readonly TimeSpan _timeOut = TimeSpan.FromSeconds(1);

	private readonly SemaphoreSlim _lock = new(1, 1);
	private bool _isDisposed;

	public bool IsOpen => serialPort.IsOpen;

	// public bool IsBusy => _lock.CurrentCount < 1;

	public static async Task<Result<SystemSerialPort, Exception>> Create(
		string portName,
		CancellationToken cancellationToken = default
	)
	{
		var serialPort = new SystemSerialPort(
			portName,
			new(portName)
			{
				BaudRate = 115200,
				DtrEnable = true, // required for CircuitPython data serial connections... todo: is this required with Rust?
				Handshake = Handshake.None,
				ReadTimeout = 1000,
				WriteTimeout = 100,
			}
		);

		return (await serialPort.Open(cancellationToken)).Match<Result<SystemSerialPort, Exception>>(
			_ => Result.Success(serialPort),
			x => Result.Fail(x)
		);
	}

	public string Name => name;

	public async Task<Result<T, Exception?>> With<T>(
		Func<BinaryReader, BinaryWriter, Task<Result<T>>> action,
		bool clearReadBuffer,
		CancellationToken cancellationToken = default
	)
	{
		ObjectDisposedException.ThrowIf(_isDisposed, this);

		using var linkedCts = GetTimeoutCts(ref cancellationToken);

		await _lock.WaitAsync(cancellationToken);

		try
		{
			if (clearReadBuffer)
				serialPort.DiscardInBuffer();

			var reader = serialPort.BaseStream.CreateDeviceReader(true);
			var writer = serialPort.BaseStream.CreateDeviceWriter(true);

			try
			{
				return (await action(reader, writer)).Match<Result<T, Exception?>>(
					x => Result.Success(x),
					() => Result.Fail((Exception?)null)
				);
			}
			catch (TimeoutException e)
			{
				return Result.Fail<Exception?>(e);
			}
			catch (IOException e)
			{
				return Result.Fail<Exception?>(e);
			}
		}
		finally
		{
			_lock.Release();
		}
	}

	public async Task<Result<Unit, Exception>> Open(CancellationToken cancellationToken)
	{
		ObjectDisposedException.ThrowIf(_isDisposed, this);

		using var linkedCts = GetTimeoutCts(ref cancellationToken);

		await _lock.WaitAsync(cancellationToken);

		try
		{
			serialPort.Open();
		}
		catch (Exception ex)
		{
			return Result.Fail(ex);
		}
		finally
		{
			_lock.Release();
		}

		return Result.Success(Unit.Value);
	}

	private static CancellationTokenSource GetTimeoutCts(ref CancellationToken cancellationToken)
	{
		var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
		cts.CancelAfter(_timeOut);
		cancellationToken = cts.Token;
		return cts;
	}

	public void Dispose()
	{
		serialPort.Dispose();
		_lock.Dispose();
		_isDisposed = true;
	}

	// public async Task Send(ReadOnlyMemory<byte> msg, CancellationToken cancellationToken = default)
	// {
	// 	await _lock.WaitAsync(cancellationToken);
	//
	// 	try
	// 	{
	// 		serialPort.BaseStream.Write(msg.Span);
	// 	}
	// 	finally
	// 	{
	// 		_lock.Release();
	// 	}
	// }
	//
	// public async Task<Result<T>> Read<T>(
	// 	Func<BinaryReader, Result<T>> deserialize,
	// 	CancellationToken cancellationToken = default
	// )
	// {
	// 	await _lock.WaitAsync(cancellationToken);
	//
	// 	try
	// 	{
	// 		using var reader = serialPort.BaseStream.CreateDeviceReader(true);
	// 		using var semaphore = new SemaphoreSlim(0);
	//
	// 		if (serialPort.BytesToRead < 1)
	// 		{
	// 			serialPort.DataReceived += OnDataReceived;
	// 			try
	// 			{
	// 				await semaphore.WaitAsync(cancellationToken);
	// 			}
	// 			finally
	// 			{
	// 				serialPort.DataReceived -= OnDataReceived;
	// 			}
	// 		}
	//
	// 		return serialPort.IsOpen ? deserialize(reader) : Result.Fail();
	//
	// 		// ReSharper disable once AccessToDisposedClosure
	// 		void OnDataReceived(object sender, SerialDataReceivedEventArgs e) => semaphore.Release();
	// 	}
	// 	finally
	// 	{
	// 		_lock.Release();
	// 	}
	//
	// 	static RentedMemory? ReadMessageData(BinaryReader reader)
	// 	{
	// 		try
	// 		{
	// 			var numBytes = reader.ReadInt32();
	//
	// 			var rented = RentedMemory.Rent(numBytes);
	// 			var buffer = rented.Data[..numBytes];
	// 			// var numBytesRead = reader.Read(buffer.Span);
	//
	// 			reader.BaseStream.ReadExactly(buffer.Span);
	// 			// if (numBytes != numBytesRead)
	// 			// {
	// 			// 	// TODO: log
	// 			// 	rented.Dispose();
	// 			// 	return null;
	// 			// }
	//
	// 			return rented;
	// 		}
	// 		catch (IOException)
	// 		{
	// 			// TODO: log
	// 		}
	// 		catch (SerializationException)
	// 		{
	// 			// TODO: log
	// 		}
	//
	// 		return null;
	// 	}
	// }
}
