using Cranky;

namespace Cardboard.Serial;

public interface ISerialPortProvider
{
	Task<IReadOnlyCollection<string>> GetPortNames();

	Task<IReadOnlyDictionary<string, Result<ISerialPort>>> GetPorts(IEnumerable<string> ports);
}
