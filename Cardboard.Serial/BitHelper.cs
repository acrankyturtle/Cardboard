namespace Cardboard.Serial;

internal static class BitReader
{
	public static byte Read(byte value, ref int i, int take)
	{
		var ret = (byte)((value >> (8 - (i + take))) & (~0 << (8 - take)));
		i += take;
		return ret;
	}
}

internal readonly struct BitWriter(byte b, int i)
{
	public byte Data => b;

	public BitWriter Write(int value, int numBits)
	{
		var newIndex = i;
		var ret = WriteValue((byte)value, ref newIndex, (byte)numBits);
		return new(ret, newIndex);
	}

	private static byte WriteValue(byte value, ref int i, byte take)
	{
		var ret = (byte)((value << (8 - (i + take))) & (~0 << (8 - take)));
		i += take;
		return ret;
	}
}
