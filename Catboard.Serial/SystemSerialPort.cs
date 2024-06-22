using System.IO.Ports;
using Catboard.Device;
using Cranky;
using Cranky.Events;

namespace Catboard.Serial;

internal sealed class SystemSerialPort : ISerialPort, IDisposable
{
	private readonly AsyncEvent<ReadOnlyRentedMemory> _received = new();

	private readonly CancellationTokenSource _cts;
	private readonly SerialPort _serialPort;
	private readonly ResponseTracker _responseTracker;
	private readonly Task _readTask;
	private readonly ThreadQueue<SerialMessage> _sendQueue;

	public bool IsRunning => _readTask.Status == TaskStatus.Running && !_cts.IsCancellationRequested;

	public bool IsOpen => _serialPort.IsOpen;

	public IAsyncEvent<ReadOnlyRentedMemory> Received => _received;

	private SystemSerialPort(
		CancellationTokenSource cts,
		SerialPort serialPort,
		ResponseTracker responseTracker,
		Task readTask,
		ThreadQueue<SerialMessage> sendQueue
	)
	{
		_cts = cts;
		_serialPort = serialPort;
		_responseTracker = responseTracker;
		_readTask = readTask;
		_sendQueue = sendQueue;
	}

	public static Result<SystemSerialPort> Create(string portName)
	{
		var serialPort = new SerialPort(portName)
		{
			BaudRate = 115200,
			DtrEnable = true, // required for CircuitPython data serial connection
			Handshake = Handshake.None,
			ReadTimeout = 1000,
			WriteTimeout = 100,
		};

		try
		{
			serialPort.Open();
		}
		catch
		{
			// todo: log
			return Result.Fail();
		}

		var cts = new CancellationTokenSource();
		var responseTracker = new ResponseTracker();
		var readThread = SerialPortReader.Run(serialPort, responseTracker, cts.Token);

		var sendQueue = new ThreadQueue<SerialMessage>(
			msg =>
			{
				while (!TryWrite(serialPort, msg))
					Thread.Sleep(1000); // todo: better timeout options
			},
			cts.Token
		);

		return new SystemSerialPort(cts, serialPort, responseTracker, readThread, sendQueue);
	}

	public async Task<Result<ReadOnlyRentedMemory>> SendRequireResponse(SerialMessage msg)
	{
		if (msg.Token is not { } token)
			throw new ArgumentException("Message must have a token to track response.");

		using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
		var responseTask = _responseTracker.Track(token, timeoutCts.Token);
		_sendQueue.Enqueue(msg);

		try
		{
			var responseMessage = await responseTask;
			return responseMessage.Data;
		}
		catch (TaskCanceledException)
		{
			// todo: log timeout!
			return Result.Fail();
		}
	}

	public async Task Send(SerialMessage msg)
	{
		await _sendQueue.EnqueueAwait(msg);
	}

	public async Task<Result<DeviceInfo>> GetDeviceInfo() =>
		(await SendRequireResponse(new SerialIdentifyMessage(0))).Select(
			x => JsonHelpers.ReadObject<DeviceIdentityResponse>(x.ToStream()).DeviceInfo
		);

	private static bool TryWrite(SerialPort serialPort, SerialMessage msg)
	{
		if (!serialPort.IsOpen)
			return false;

		using var writer = serialPort.CreateWriter();
		try
		{
			msg.WriteTo(writer);
		}
		catch (Exception)
		{
			// todo: log
			return false;
		}

		return true;
	}

	public void Dispose()
	{
		_cts.Cancel();
		_cts.Dispose();
		_serialPort.Dispose();
	}
}

public class DeviceIdentityResponse
{
	public required DeviceInfo DeviceInfo { get; init; }
}
