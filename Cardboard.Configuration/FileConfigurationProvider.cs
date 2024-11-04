// using System.Text.Json;
// using Cardboard.Services;
// using Cranky.Events;
// using Microsoft.Extensions.DependencyInjection;
// using Microsoft.Extensions.Options;
//
// namespace Cardboard.Configuration;
//
// internal class FileConfigurationProvider<T>(
// 	FileConfigurationProvider<T>.Parameters parameters,
// 	IOptions<FileConfigurationOptions> options
// ) : IConfigurationProvider<T>, IRefreshableFileConfiguration, IInitialize
// 	where T : new()
// {
// 	public readonly record struct Parameters(string Name);
//
// 	private string FileName { get; } =
// 		Path.Combine(Path.GetFullPath(options.Value.Path), $"{parameters.Name}.json");
// 	public IReadOnlyObservableProperty<T> Property => _value;
//
// 	private readonly ObservableProperty<T> _value = new(new());
//
// 	public async Task Modify(Func<T, T> modifyFunc)
// 	{
// 		var value = modifyFunc(_value.Value);
//
// 		try
// 		{
// 			await using var fileStream = File.OpenWrite(FileName);
// 			await JsonSerializer.SerializeAsync(fileStream, value);
// 		}
// 		catch (Exception ex) when (ex is JsonException or IOException)
// 		{
// 			// todo: log?
// #if DEBUG
// 			throw;
// #endif
// 		}
// 	}
//
// 	public async Task Initialize()
// 	{
// 		await Refresh();
// 	}
//
// 	public async Task Refresh()
// 	{
// 		try
// 		{
// 			var dir = Path.GetDirectoryName(FileName);
//
// 			if (dir is null)
// 				throw new InvalidOperationException($"Could not get directory of `{FileName}`.");
//
// 			if (!Directory.Exists(dir))
// 			{
// 				Directory.CreateDirectory(dir);
// 				return;
// 			}
//
// 			if (!File.Exists(FileName))
// 				return;
//
// 			await using var fileStream = File.OpenRead(FileName);
// 			var value =
// 				JsonSerializer.Deserialize<T>(fileStream)
// 				?? throw new JsonException("Property cannot be null.");
//
// 			await _value.SetWait(value);
// 		}
// 		catch (Exception ex) when (ex is JsonException or IOException)
// 		{
// 			// todo: log?
// #if DEBUG
// 			throw;
// #endif
// 		}
// 	}
// }
//
// internal interface IRefreshableFileConfiguration
// {
// 	Task Refresh();
// }
//
// public static partial class Services
// {
// 	public static IServiceCollection AddFileConfiguration<T>(this IServiceCollection services, string name)
// 		where T : new() =>
// 		services
// 			.AddSingleton<FileConfigurationProvider<T>>(
// 				sp =>
// 					ActivatorUtilities.CreateInstance<FileConfigurationProvider<T>>(
// 						sp,
// 						new FileConfigurationProvider<T>.Parameters(name)
// 					)
// 			)
// 			.AddSingleton<IConfigurationProvider<T>>(
// 				sp => sp.GetRequiredService<FileConfigurationProvider<T>>()
// 			)
// 			.AddSingleton<IInitialize>(sp => sp.GetRequiredService<FileConfigurationProvider<T>>());
// }
