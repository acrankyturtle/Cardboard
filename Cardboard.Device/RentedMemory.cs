using System.Buffers;
using CommunityToolkit.HighPerformance;

namespace Cardboard.Device;

public readonly struct RentedMemory(Memory<byte> data, Action? dispose) : IDisposable
{
	public static RentedMemory Empty = default;

	public Memory<byte> Data => data;

	public void Dispose()
	{
		dispose?.Invoke();
	}

	public RentedMemory Slice(int start, int length) => new(data.Slice(start, length), dispose);

	public static RentedMemory Rent(int length)
	{
		var memoryOwner = MemoryPool<byte>.Shared.Rent(length);
		var memory = memoryOwner.Memory[..length];
		return new(memory, () => memoryOwner.Dispose());
	}
}

public readonly struct ReadOnlyRentedMemory(ReadOnlyMemory<byte> data, Action? dispose) : IDisposable
{
	public ReadOnlyMemory<byte> Data => data;

	public void Dispose()
	{
		dispose?.Invoke();
	}

	public ReadOnlyRentedMemory Slice(int start, int length) => new(data.Slice(start, length), dispose);

	public static ReadOnlyRentedMemory Rent(int length)
	{
		var memoryOwner = MemoryPool<byte>.Shared.Rent(length);
		var memory = memoryOwner.Memory[..length];
		return new(memory, () => memoryOwner.Dispose());
	}

	public static implicit operator ReadOnlyRentedMemory(RentedMemory rentedMemory) =>
		new(rentedMemory.Data, rentedMemory.Dispose);
}

public static class Extensions_Buffer
{
	public static Stream ToStream(this RentedMemory rentedMemory) => rentedMemory.Data.AsStream();

	public static Stream ToStream(this ReadOnlyRentedMemory rentedMemory) => rentedMemory.Data.AsStream();
}
