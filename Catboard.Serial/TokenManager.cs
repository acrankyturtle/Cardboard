namespace Catboard.Serial;

internal class TokenManager
{
	private byte _nextId;
	private readonly SemaphoreSlim _idLock = new(1);

	public byte Next()
	{
		_idLock.Wait();

		try
		{
			IncrementId();
			return _nextId;
		}
		finally
		{
			_idLock.Release();
		}

		void IncrementId()
		{
			unchecked
			{
				_nextId++;
			}

			if (_nextId == 0)
				// if we overflow, reset to 1 because 0 is not a valid id
				_nextId = 1;
		}
	}
}