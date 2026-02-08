namespace Cardboard.Update.Api;

public interface IClearMemoryCache
{
	void ClearMemoryCache();
}

public interface IClearDiskCache
{
	Task ClearDiskCache();
}
