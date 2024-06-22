using System.IO.Ports;
using System.Text;

namespace Catboard.Serial;

internal static class Extensions_SerialPort
{
	public static BinaryReader CreateReader(this SerialPort serialPort) =>
		new(serialPort.BaseStream, Encoding.UTF8, true);

	public static BinaryWriter CreateWriter(this SerialPort serialPort) =>
		new(serialPort.BaseStream, Encoding.UTF8, true);
}