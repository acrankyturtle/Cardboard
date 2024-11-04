// using System.Buffers;
// using System.IO.Ports;
// using System.Runtime.Serialization;
// using Cardboard.Device;
// using Cranky;
//
// namespace Cardboard.Serial;
//
// internal static class SerialPortReader
// {
// 	/// <summary>
// 	/// Starts a message loop on the current thread. Will block until the cancellation token is requested.
// 	/// </summary>
// 	public static async Task Run(
// 		SerialPort serialPort,
// 		ResponseTracker responseTracker,
// 		CancellationToken cancellationToken
// 	)
// 	{
// 		await Task.Yield(); // allow caller to continue
//
// 		using var reader = serialPort.BaseStream.CreateDeviceReader();
// 		using var semaphore = new SemaphoreSlim(0);
// 		serialPort.DataReceived += OnDataReceived;
//
// 		try
// 		{
// 			while (!cancellationToken.IsCancellationRequested)
// 			{
// 				// change timeout if DataReceived event ends up not being reliable
// 				await semaphore.WaitAsync(TimeSpan.FromMilliseconds(-1), cancellationToken);
//
// 				// why would this happen? idk but check just in case?
// 				if (!serialPort.IsOpen)
// 					continue;
//
// 				try
// 				{
// 					var response = SerialResponse.ReadFrom(reader);
// 					responseTracker.Complete(response);
// 				}
// 				catch (IOException)
// 				{
// 					// TODO: log
// #if DEBUG
// 					throw;
// #endif
// 				}
// 				catch (SerializationException)
// 				{
// 					// TODO: log
// #if DEBUG
// 					throw;
// #endif
// 				}
// 			}
// 		}
// 		finally
// 		{
// 			serialPort.DataReceived -= OnDataReceived;
// 		}
//
// 		return;
//
// 		// ReSharper disable once AccessToDisposedClosure
// 		void OnDataReceived(object sender, SerialDataReceivedEventArgs e) => semaphore.Release();
// 	}
// }
