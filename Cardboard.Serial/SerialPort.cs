using System.IO.Ports;
using System.Text;
using Cardboard.Device;
using Cranky;

namespace Cardboard.Serial;

public interface ISerialPort : IAsyncDisposable
{
	string PortName { get; }

	Task<Result<T, Exception>> With<T>(
		Func<ICommandStream, Task<T>> action,
		CancellationToken cancellationToken = default
	);
}

public sealed class SystemSerialPort(string name, SerialPort serialPort) : ISerialPort
{
	private static readonly TimeSpan _timeOut = TimeSpan.FromSeconds(3);

	private readonly SemaphoreSlim _lock = new(1, 1);

	public string PortName => name;

	public static Result<SystemSerialPort, Exception> Create(string portName)
	{
		var serialPort = new SerialPort(portName)
		{
			BaudRate = 115200,
			DtrEnable = true, // required for CircuitPython data serial connections... todo: is this required with Rust?
			Handshake = Handshake.None,
			ReadTimeout = 10000,
			WriteTimeout = 10000,
		};

		try
		{
			serialPort.Open();
		}
		catch (Exception ex)
		{
			return Result.Fail(ex);
		}

		return new SystemSerialPort(portName, serialPort);
	}

	public async Task<Result<T, Exception>> With<T>(
		Func<ICommandStream, Task<T>> action,
		CancellationToken cancellationToken = default
	)
	{
		var result = await GetCommandStream(cancellationToken);

		try
		{
			if (!result.TryGetSuccess(out var commandStream))
				return result.AssertError();

			try
			{
				return await action(commandStream);
			}
			catch (TimeoutException e)
			{
				return Result.Fail<Exception>(e);
			}
			catch (IOException e)
			{
				return Result.Fail<Exception>(e);
			}
		}
		finally
		{
			_lock.Release();
		}
	}

	private async Task<Result<ICommandStream, Exception>> GetCommandStream(
		CancellationToken cancellationToken = default
	)
	{
		try
		{
			await _lock.WaitAsync(_timeOut, cancellationToken);
			return new SerialCommandStream(serialPort, _lock);
		}
		catch (Exception e)
		{
			return e;
		}
	}

	public async ValueTask DisposeAsync()
	{
		await _lock.WaitAsync();

		serialPort.Dispose();
		_lock.Dispose();
	}

	private class SerialCommandStream(SerialPort serialPort, SemaphoreSlim semaphore) : ICommandStream
	{
		private readonly BinaryReader _reader = new(serialPort.BaseStream, Encoding.UTF8, true);
		private readonly BinaryWriter _writer = new(serialPort.BaseStream, Encoding.UTF8, true);

		private bool _isDisposed;

		public BinaryReader Reader =>
			!_isDisposed ? _reader : throw new ObjectDisposedException(nameof(SerialCommandStream));

		public BinaryWriter Writer =>
			!_isDisposed ? _writer : throw new ObjectDisposedException(nameof(SerialCommandStream));

		public void ClearReadBuffer()
		{
			ObjectDisposedException.ThrowIf(_isDisposed, this);

			serialPort.DiscardInBuffer();
		}

		public void Dispose()
		{
			_reader.Dispose();
			_writer.Dispose();

			_isDisposed = true;
			semaphore.Release();
		}
	}
}
