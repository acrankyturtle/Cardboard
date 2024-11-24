using Cranky;

namespace Cardboard.Serial;

public interface ISerialPortProvider
{
	Task<IReadOnlyCollection<string>> GetPortNames(CancellationToken cancellationToken = default);

	Task<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>> GetPorts(
		IEnumerable<string> ports,
		CancellationToken cancellationToken = default
	);
}
