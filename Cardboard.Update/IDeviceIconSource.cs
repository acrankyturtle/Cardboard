namespace Cardboard.Update;

public interface IDeviceIconSource
{
	Task<DeviceIcon?> GetIcon(string fileName, CancellationToken cancellationToken = default);
}

public sealed class DeviceIcon(byte[] data, string contentType)
{
	public byte[] Data { get; } = data;
	public string ContentType { get; } = contentType;
}
