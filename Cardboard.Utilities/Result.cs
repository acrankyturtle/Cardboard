using System.Diagnostics.CodeAnalysis;

namespace Cardboard.Utilities;

public readonly struct SuccessfulResult
{
	public static implicit operator SuccessfulResult<Unit>(SuccessfulResult result) => new();
}

public readonly struct SuccessfulResult<TSuccess>(TSuccess value)
{
	public TSuccess Value { get; } = value; // great success 👍👍

	public static implicit operator SuccessfulResult(SuccessfulResult<TSuccess> result) => new();
}

public readonly struct FailingResult
{
	public static implicit operator FailingResult<Unit>(FailingResult result) => new();
}

public readonly struct FailingResult<TError>(TError value)
{
	public TError Value { get; } = value;

	public static implicit operator FailingResult(FailingResult<TError> result) => new();
}

public readonly struct Result(bool isSuccess)
{
	private readonly bool _isSuccess = isSuccess;

	public bool IsSuccess => _isSuccess;

	public static implicit operator bool(Result result) => result._isSuccess;

	public static implicit operator Result(bool result) => new(result);

	public static implicit operator Result(SuccessfulResult result) => new(true);

	public static implicit operator Result(FailingResult result) => new(false);

	public T Match<T>(Func<T> success, Func<T> error) => (_isSuccess ? success : error)();

	public void Match(Action success, Action error) =>
		Match<Unit>(
			() =>
			{
				success();
				return default;
			},
			() =>
			{
				error();
				return default;
			}
		);

	public void Assert()
	{
		if (!_isSuccess)
			throw ResultHelpers.GetAssertException();
	}

	public static SuccessfulResult Success() => new();

	public static SuccessfulResult<T> Success<T>(T value) => new(value);

	public static FailingResult Fail() => new();

	public static FailingResult<TError> Fail<TError>(TError value) => new(value);
}

// gives a value if the operation succeeds, or informs of general failure if not
public readonly struct Result<TSuccess>
{
	public bool IsSuccess { get; }
	private readonly TSuccess _success;

	private Result(bool isSuccess, TSuccess? success)
	{
		IsSuccess = isSuccess;
		_success = success!;
	}

	public Result(TSuccess success)
		: this(true, success) { }

	public static Result<TSuccess> Fail => default;

	public static implicit operator Result<TSuccess>(TSuccess success) => new(true, success);

	public static implicit operator bool(Result<TSuccess> result) => result.IsSuccess;

	public static implicit operator Result<TSuccess>(FailingResult result) => new(false, default);

	public static implicit operator Result<TSuccess>(SuccessfulResult<TSuccess> result) =>
		new(true, result.Value);

	public T Match<T>(Func<TSuccess, T> success, Func<T> error) => IsSuccess ? success(_success) : error();

	public void Match(Action<TSuccess> success, Action? error = null) =>
		Match<Unit>(
			s =>
			{
				success(s);
				return default;
			},
			() =>
			{
				error?.Invoke();
				return default;
			}
		);

	public Task Match(Func<TSuccess, Task> success) => Match(success, () => Task.CompletedTask);

	public bool TryGet([MaybeNullWhen(false)] out TSuccess value)
	{
		value = _success;
		return IsSuccess;
	}

	public TSuccess Assert()
	{
		if (!IsSuccess)
			throw ResultHelpers.GetAssertException();

		return _success;
	}

	public static Result<TSuccess> Success(TSuccess value) => new(true, value);
}

// gives a value if the operation succeeds, or gives an error value on failure
public readonly struct Result<TSuccess, TError>
{
	public bool IsSuccess { get; }
	private readonly TSuccess _success;
	private readonly TError _error;

	public Result(TSuccess success)
	{
		IsSuccess = true;
		_success = success;
		_error = default!;
	}

	public Result(TError error)
	{
		IsSuccess = false;
		_success = default!;
		_error = error;
	}

	public static implicit operator Result<TSuccess, TError>(TSuccess success) => new(success);

	public static implicit operator Result<TSuccess, TError>(TError error) => new(error);

	public static implicit operator Result<TSuccess, TError>(SuccessfulResult<TSuccess> result) =>
		new(result.Value);

	public static implicit operator Result<TSuccess, TError>(FailingResult<TError> result) =>
		new(result.Value);

	public T Match<T>(Func<TSuccess, T> success, Func<TError, T> error) =>
		IsSuccess ? success(_success) : error(_error);

	public void Match(Action<TSuccess> success, Action<TError> error) =>
		Match<Unit>(
			s =>
			{
				success(s);
				return default;
			},
			e =>
			{
				error(e);
				return default;
			}
		);

	public bool TryGet([MaybeNullWhen(false)] out TSuccess success, [MaybeNullWhen(true)] out TError error)
	{
		success = _success;
		error = _error;
		return IsSuccess;
	}

	public TSuccess Assert()
	{
		if (!IsSuccess)
			throw ResultHelpers.GetAssertException();

		return _success;
	}

	public TError AssertError()
	{
		if (IsSuccess)
			throw ResultHelpers.GetAssertErrorException();

		return _error;
	}

	public bool TryGetSuccess([MaybeNullWhen(false)] out TSuccess success) =>
		TryGetSuccess(out success, out _);

	public bool TryGetSuccess(
		[MaybeNullWhen(false)] out TSuccess success,
		[MaybeNullWhen(true)] out TError error
	)
	{
		success = _success;
		error = _error;
		return IsSuccess;
	}

	public bool TryGetError([MaybeNullWhen(false)] out TError error) => !TryGetSuccess(out _, out error);

	public bool TryGetError(
		[MaybeNullWhen(false)] out TError error,
		[MaybeNullWhen(true)] out TSuccess success
	) => !TryGetSuccess(out success, out error);

	public static Result<TSuccess, TError> Success(TSuccess success) => new(success);

	public static Result<TSuccess, TError> Error(TError error) => new(error);
}

internal static class ResultHelpers
{
	public static Exception GetAssertException() => new("Cannot unwrap success from error result.");

	public static Exception GetAssertErrorException() => new("Cannot unwrap error from success result.");
}

public static class Extensions_Result
{
	public static Result<T> Select<T>(this Result result, Func<T> selector) =>
		result.Match<Result<T>>(() => selector(), () => Result.Fail());

	public static Result<TOut> Select<TIn, TOut>(this Result<TIn> result, Func<TIn, TOut> selector) =>
		result.Match<Result<TOut>>(x => selector(x), () => Result.Fail());

	public static Result<TOut, TError> Select<TIn, TOut, TError>(
		this Result<TIn, TError> result,
		Func<TIn, TOut> selector
	) => result.Match<Result<TOut, TError>>(x => selector(x), e => Result.Fail(e));

	public static Task Match(this Result result, Func<Task> success) =>
		result.Match(success, () => Task.CompletedTask);

	public static async Task Match<T>(
		this Result<T> result,
		Func<T, Task> success,
		Func<Task>? error = null
	) => await result.Match(success, error ?? (() => Task.CompletedTask));

	public static async Task<TOut> Match<TIn, TOut>(
		this Task<Result<TIn>> result,
		Func<TIn, TOut> success,
		Func<TOut> error
	) => (await result).Match(success, error);

	public static async Task<TOut> Match<TSuccess, TError, TOut>(
		this Task<Result<TSuccess, TError>> result,
		Func<TSuccess, TOut> success,
		Func<TError, TOut> error
	) => (await result).Match(success, error);

	public static async Task<TOut> Match<TSuccess, TError, TOut>(
		this Task<Result<TSuccess, TError>> result,
		Func<TSuccess, Task<TOut>> success,
		Func<TError, Task<TOut>> error
	) => await (await result).Match(success, error);

	public static async Task Match<T>(
		this Task<Result<T>> result,
		Func<T, Task> success,
		Func<Task>? error = null
	) => await Match(await result, success, error);

	public static async Task Assert(this Task<Result> result) => (await result).Assert();

	public static async Task<T> Assert<T>(this Task<Result<T>> result) => (await result).Assert();

	public static async Task<T> Assert<T, TError>(this Task<Result<T, TError>> result) =>
		(await result).Assert();

	public static (IReadOnlyCollection<TSuccess> Successes, IReadOnlyCollection<TError> Errors) Split<
		TSuccess,
		TError
	>(this IEnumerable<Result<TSuccess, TError>> results)
	{
		var lookup = results.ToLookup(x => x.IsSuccess);
		var successes = lookup[true].Select(x => x.Assert()).ToList();
		var errors = lookup[false].Select(x => x.AssertError()).ToList();
		return (successes, errors);
	}
}
