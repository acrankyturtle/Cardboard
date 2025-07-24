namespace Cardboard.Utilities;

public class FileWatcher : IDisposable
{
	private readonly AsyncDispatchSubject<FileChangedEvent> _dispatchSubject;
	private readonly LazyObservable<FileChangedEvent> _lazy;
	public IObservable<FileChangedEvent> OnChanged { get; }

	private readonly FileSystemWatcher _watcher;

	private bool _disposed;

	public FileWatcher(string path)
	{
		var directory =
			Path.GetDirectoryName(path)
			?? throw new ArgumentException("Path must be a valid file path.", nameof(path));
		var fileName = Path.GetFileName(path);

		_dispatchSubject = new();

		_watcher = new(directory, fileName);
		_watcher.NotifyFilter = NotifyFilters.LastWrite;
		_watcher.Changed += OnFileChanged;
		_watcher.Created += OnFileCreated;
		_watcher.Deleted += OnFileDeleted;
		_watcher.Renamed += OnFileRenamed;
		_watcher.Error += (_, e) =>
		{
			_dispatchSubject.OnError(e.GetException());
		};

		_lazy = _dispatchSubject.Lazy(
			() => _watcher.EnableRaisingEvents = true,
			() => _watcher.EnableRaisingEvents = false
		);

		OnChanged = _lazy;
	}

	private void OnFileChanged(object _, FileSystemEventArgs e)
	{
		_dispatchSubject.OnNext(new(e.FullPath));
	}

	private void OnFileCreated(object _, FileSystemEventArgs e)
	{
		_dispatchSubject.OnNext(new(e.FullPath));
	}

	private void OnFileDeleted(object _, FileSystemEventArgs e)
	{
		_dispatchSubject.OnNext(new(e.FullPath));
	}

	private void OnFileRenamed(object _, RenamedEventArgs e)
	{
		_dispatchSubject.OnNext(new(e.FullPath));
	}

	public void Dispose()
	{
		if (_disposed)
			return;

		GC.SuppressFinalize(this);

		_watcher.Dispose();

		_dispatchSubject.OnCompleted();

		_lazy.Dispose();
		_dispatchSubject.Dispose();

		_disposed = true;
	}
}

public readonly record struct FileChangedEvent(string FilePath);
