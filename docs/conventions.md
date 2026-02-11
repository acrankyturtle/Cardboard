# Conventions

Design patterns, code style, and project conventions used across Cardboard.

## Strongly-Typed IDs

Domain identifiers are wrapped in value types using the `StronglyTypedIds` source generator. This prevents accidental mixing of ID types at compile time and provides consistent JSON serialization.

```csharp
[StronglyTypedId]                    // UUID (default)
public readonly partial struct DeviceId;

[StronglyTypedId(Template.String)]   // string
public readonly partial struct LayerTag;

[StronglyTypedId(Template.Int)]      // int
public readonly partial struct CommandIndex;

[StronglyTypedId(Template.Long)]     // long (used where uint is needed)
public readonly partial struct Channel;
```

The generator produces the backing value, equality, hash code, JSON converter, and `TypeConverter`. Swagger mappings are registered in `Cardboard.Controller/Program.cs`:

```csharp
options.MapStronglyTypedId<DeviceId>();
```

## Command Pattern

Commands represent operations that the host can execute on a connected device over serial.

### C# (Host)

```csharp
public interface ICommand<in TIn, out TOut>
{
    CommandId Id { get; }
    TOut Execute(TIn input, ICommandStream stream);
}
```

`ICommandStream` wraps a `BinaryReader`/`BinaryWriter` pair connected to the device serial port. The host resolves a command's index from the device's command list (returned by Identify), writes the index byte, then calls `Execute` which handles the remaining binary I/O.

### Rust (Firmware)

```rust
#[async_trait(?Send)]
pub trait Command<Context> {
    fn info(&self) -> CommandInfo;
    async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str>;
}
```

Commands are generic over a `Context` type and declare their requirements via trait bounds (see [Firmware Context Pattern](#firmware-context-pattern)). Each command has a UUID (`CommandId`) and a human-readable name.

## Binary Serialization

Both the host and firmware implement mirrored serialization traits for the serial protocol.

### C# (Host)

```csharp
public interface IReadable<out T>
{
    static abstract T ReadFrom(BinaryReader reader);
}

public interface IWriteable
{
    void WriteTo(BinaryWriter writer);
}
```

Extension methods on `BinaryReader`/`BinaryWriter` provide primitives:

| Method | Encoding |
|--------|----------|
| `ReadByte()` / `Write(byte)` | 1 byte |
| `ReadUInt16()` / `Write(ushort)` | 2 bytes, little-endian |
| `ReadUInt32()` / `Write(uint)` | 4 bytes, little-endian |
| `ReadUInt64()` / `Write(ulong)` | 8 bytes, little-endian |
| `ReadBoolean()` / `Write(bool)` | 1 byte (0 = false, non-zero = true) |
| `ReadGuid()` / `WriteGuid(Guid)` | 16 bytes, little-endian UUID |
| `ReadStringU8()` / `WriteStringU8(string)` | u8 length prefix + UTF-8 bytes |
| `ReadCollectionU8<T>()` / `WriteCollectionU8<T>(...)` | u8 count + N items |
| `ReadCollectionU16<T>()` / `WriteCollectionU16<T>(...)` | u16 count + N items |
| `ReadOptionValue<T>(...)` / `WriteOption<T>(...)` | bool prefix + optional value |

### Rust (Firmware)

```rust
pub trait Readable {
    async fn read_from<R: ReadAsync>(reader: &mut R) -> Result<Self, &'static str>;
}

pub trait Writeable {
    async fn write_to<W: WriteAsync>(&self, writer: &mut W) -> Result<(), &'static str>;
}
```

The `ReadAsyncExt` / `WriteAsyncExt` extension traits provide the same primitive set (`read_u8`, `write_u16`, `read_uuid`, `read_collection_u8`, `write_string_u8`, `read_option`, etc.). All multi-byte integers are little-endian.

## Repository Pattern

Domain operations are exposed through repository interfaces that abstract over device communication and persistence.

```csharp
public interface IDeviceRepository
{
    Task<IReadOnlyCollection<DeviceSummary>> GetDevices(CancellationToken cancellationToken);
    Task<DeviceDetails?> GetDeviceDetails(DeviceId deviceId, CancellationToken cancellationToken);
    Task<Profile?> GetDeviceProfile(DeviceId deviceId, CancellationToken cancellationToken);
    Task<UpdateDeviceProfileResult> UpdateDeviceProfile(DeviceId id, Profile profile, ...);
    // ...
}
```

Repositories coordinate between `IDeviceService` (serial communication), `IFirmwareSource` (firmware binaries), and `IAssociationRepository` (tag/application associations persisted to disk).

## Reactive Event Streams

The project uses `System.Reactive` (`IObservable<T>`) for event propagation from devices up through the API layer.

### AsyncDispatchSubject

`AsyncDispatchSubject<T>` is a custom `ISubject<T>` that decouples event producers from subscribers using a `System.Threading.Channels.Channel<T>`. Events are written to the channel from any thread via `OnNext`, and a background task reads from the channel and dispatches to `System.Reactive.Subjects.Subject<T>` subscribers. This prevents slow subscribers from blocking the producer.

```csharp
public class AsyncDispatchSubject<T> : ISubject<T>, IDisposable
```

Used by `DeviceService`, `WindowsSerialDeviceProvider`, `ApplicationEventService`, and others to publish domain events.

### SSE Streaming

The HTTP API exposes `IObservable` streams as Server-Sent Events. The `/api/devices/events` endpoint subscribes to `IDeviceService.OnDevicesChanged` and writes events to the response stream. A 30-second keepalive heartbeat detects stale connections.

## Railway-Oriented Error Handling

`Cardboard.Utilities` provides three `Result` types for expressing success/failure without exceptions:

| Type | Description |
|------|-------------|
| `Result` | Success or failure (no values) |
| `Result<TSuccess>` | Carries a value on success, nothing on failure |
| `Result<TSuccess, TError>` | Carries a value on success, an error value on failure |

All three support:
- Implicit conversion from values
- `Match` for exhaustive handling
- `TryGet` / `TryGetSuccess` / `TryGetError` for conditional extraction
- `Assert()` to unwrap or throw
- `Select` (LINQ-style map)
- Async extension methods for chaining with `Task<Result<...>>`

Creation uses static helpers: `Result.Success(value)`, `Result.Fail(error)`.

## Minimal API Organization

Each endpoint group is a static class with an extension method that registers routes on `IEndpointRouteBuilder`:

```csharp
public static class Devices
{
    public static void MapDeviceRepositoryEndpoints(this IEndpointRouteBuilder builder)
    {
        var group = builder.MapGroup("devices").WithTags("Devices");
        group.MapGet("/", GetDevices).WithName("Get Devices").Produces<DeviceListResponse>();
        // ...
    }

    private static async Task<Ok<DeviceListResponse>> GetDevices(...) => ...;
}
```

Conventions:
- Route groups map 1:1 to static classes (`Devices`, `Tags`, `Logs`, `InputDevices`, `UpdateController`)
- Response DTO classes are co-located in the same file as their endpoint class
- Handler methods are `private static` with typed results (`Results<Ok<T>, NotFound>`)
- All endpoints are mounted under `/api` via `MapFrontendApi()` in `Cardboard.FrontendHost/Services.cs`

## Firmware Context Pattern

Firmware commands declare their hardware requirements through trait bounds on a generic `Context` type parameter, rather than accepting concrete dependencies:

```rust
impl<Context: ContextSerialRx + ContextSerialTx + ContextProfileFlash + ContextUpdateProfile>
    Command<Context> for UpdateProfileCommand
```

Each `Context*` trait provides access to a single capability:

| Trait | Provides |
|-------|----------|
| `ContextDeviceInfo` | Static device metadata |
| `ContextSerialRx` / `ContextSerialTx` | Serial port read/write |
| `ContextProfileFlash` / `ContextSettingsFlash` | Flash memory partitions |
| `ContextUpdateProfile` | Profile update signal |
| `ContextTags` | External tag updates |
| `ContextVirtualKeys<N>` | Virtual key state |
| `ContextAllocator` | Heap allocator stats |
| `ContextReboot` | Reboot / bootloader entry |
| `ContextErrorLog` | Runtime error log |
| `ContextClock` | Monotonic clock |

A concrete `Context` struct holds all runtime dependencies and implements all traits. Commands only see the subset they need, enabling testability with minimal fakes.

## DI Composition

Each C# project exposes a `static partial class Services` with extension methods on `IServiceCollection`:

```csharp
// Cardboard.Device/Services.cs
public static partial class Services
{
    public static IServiceCollection AddDeviceServices(this IServiceCollection services) =>
        services.AddDeviceService();
}

// Cardboard.Repositories/Services.cs
public static partial class Services
{
    public static IServiceCollection AddRepositories(
        this IServiceCollection services,
        IConfigurationSection configuration
    ) => services.Configure<...>(configuration).AddDeviceRepository().AddApplicationRepository().AddLogSink();
}
```

The composition root in `Cardboard.Controller/Program.cs` chains these together:

```csharp
builder.Services
    .AddDeviceServices()
    .AddCardboardServices()
    .AddRepositories(pathsConfig)
    .AddFrontendHosting()
    // ...
```

Private extension methods within each `Services` class register individual service implementations, keeping DI wiring close to the types it registers.

## Code Formatting

| Language | Tool | Config |
|----------|------|--------|
| C# | [CSharpier](https://csharpier.com/) | `.csharpierrc.json` &mdash; tabs, 110 print width |
| TypeScript | [Prettier](https://prettier.io/) + [ESLint](https://eslint.org/) | `.prettierrc` (Tailwind plugin), `eslint.config.js` (react-hooks, react-refresh, typescript-eslint) |
| Rust | `rustfmt` | Default settings |
