using System.IO.Ports;
using System.Text;
using Cardboard.Device;
using Cardboard.Utilities;
using Microsoft.Extensions.Logging;

namespace Cardboard.Serial;

public interface ISerialPort : IAsyncDisposable
{
	string PortName { get; }

	Task<Result<T, Exception>> With<T>(
		Func<ICommandStream, Task<T>> action,
		CancellationToken cancellationToken = default
	);
}

internal class LogSemaphoreSlim(SemaphoreSlim impl, ILogger logger) : IDisposable
{
	public async Task<bool> WaitAsync(TimeSpan timeout, CancellationToken cancellationToken)
	{
		var result = await impl.WaitAsync(timeout, cancellationToken);

		if (!result)
			logger.LogWarning("Timeout waiting for semaphore.");

		return result;
	}

	public void Release()
	{
		impl.Release();
	}

	public void Dispose()
	{
		impl.Dispose();
	}
}

public sealed class SystemSerialPort(string name, SerialPort serialPort, ILogger logger) : ISerialPort
{
	private static readonly TimeSpan _timeOut = TimeSpan.FromSeconds(10);

	private readonly LogSemaphoreSlim _lock = new(new(1, 1), logger);

	public string PortName => name;

	public static Result<SystemSerialPort, Exception> Create(string portName, ILogger logger)
	{
		var serialPort = new SerialPort(portName)
		{
			BaudRate = 115200,
			DataBits = 8,
			DtrEnable = true, // required for CircuitPython data serial connections... todo: is this required with Rust?
			Handshake = Handshake.None,
			NewLine = "\n",
			Parity = Parity.None,
			StopBits = StopBits.One,
			ReadTimeout = 1000,
			WriteTimeout = 1000,
		};

		try
		{
			serialPort.Open();
		}
		catch (Exception ex)
		{
			return Result.Fail(ex);
		}

		return new SystemSerialPort(portName, serialPort, logger);
	}

	public async Task<Result<T, Exception>> With<T>(
		Func<ICommandStream, Task<T>> action,
		CancellationToken cancellationToken = default
	)
	{
		if (!await _lock.WaitAsync(_timeOut, cancellationToken))
		{
			// could not acquire lock in time -- return a TimeoutException with a populated stack trace
			try
			{
				// hack: populate stack trace
				throw new TimeoutException("Failed to acquire lock for serial port.");
			}
			catch (TimeoutException e)
			{
				return e;
			}
		}

		try
		{
			var commandStream = new SerialCommandStream(serialPort);
			return await action(commandStream);
		}
		catch (Exception e)
		{
			return Result.Fail(e);
		}
		finally
		{
			_lock.Release();
		}
	}

	public async ValueTask DisposeAsync()
	{
		serialPort.Dispose();
		_lock.Dispose();
	}

	private class SerialCommandStream(SerialPort serialPort) : ICommandStream
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
		}
	}
}
