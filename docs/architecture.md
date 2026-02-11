# Architecture

Deep dive into the Cardboard system architecture, component relationships, and data flow.

## System Overview

```
┌─────────────────────────────────┐
│         React Frontend          │
│  (TypeScript / Vite / Tailwind) │
└────────────┬────────────────────┘
             │ HTTP REST + SSE
             │ (localhost:5173 dev / embedded prod)
┌────────────▼────────────────────┐
│        .NET Backend             │
│  (ASP.NET Core / Kestrel)       │
│  localhost:7000                 │
└────────────┬────────────────────┘
             │ USB CDC-ACM Serial
             │ (64-byte packets)
┌────────────▼────────────────────┐
│       Device Firmware           │
│  (Rust / Embassy / RP2040)      │
│  USB HID + Serial               │
└─────────────────────────────────┘
```

The frontend communicates with the backend over HTTP. The backend discovers and manages devices over USB serial. Devices present themselves as composite USB devices with HID endpoints (keyboard, mouse, consumer control) and a CDC-ACM serial endpoint for host communication.

## Backend Architecture

### Solution Structure

**API Layer** — HTTP endpoints and serialization

| Project | Purpose |
|---------|---------|
| `Cardboard.Controller` | ASP.NET Core host, DI composition root, middleware pipeline |
| `Cardboard.HttpApi` | Minimal API endpoint definitions (Devices, Tags, Logs, InputDevices, Controller) |
| `Cardboard.Api` | Shared API setup, JSON serialization configuration (camelCase, null handling, enum converters) |
| `Cardboard.FrontendHost` | SPA hosting, origin validation middleware, route mounting |

**Service Layer** — Business logic and coordination

| Project | Purpose |
|---------|---------|
| `Cardboard.Services` | Core services: tag association management, virtual key dispatch |
| `Cardboard.Repositories` | Data access: device repository, application association persistence |
| `Cardboard.Events` | Cross-platform event abstractions (application focus, input) |

**Device Layer** — Device communication primitives

| Project | Purpose |
|---------|---------|
| `Cardboard.Device` | Device abstractions: commands, profiles, settings, binary serialization |
| `Cardboard.Serial` | Serial port abstractions |
| `Cardboard.Windows` | Windows-specific: serial device discovery (WMI), input monitoring, tray icon, service hosting |

**Infrastructure Layer**

| Project | Purpose |
|---------|---------|
| `Cardboard.Metadata` | Device metadata source interfaces (icons, model info) |
| `Cardboard.Utilities` | Shared utilities: `AsyncDispatchSubject`, `Result` types, file watcher |

**Update Layer** — Firmware and controller updates

| Project | Purpose |
|---------|---------|
| `Cardboard.Update` | Firmware update orchestration, bootloader detection |
| `Cardboard.Update.Api` | Update server API client |
| `Cardboard.Update.Api.Abstractions` | Shared types between update client and server |
| `Cardboard.UpdateServer` | Firmware distribution server (separate deployment) |

### Request Flow

```
HTTP Request
  → Kestrel
  → Origin Validation Middleware (blocks non-localhost origins)
  → Routing (/api/devices/{id}/profile)
  → Minimal API Handler (Devices.GetDeviceProfile)
  → IDeviceRepository.GetDeviceProfile(DeviceId)
  → IDeviceService.SendCommand(GetProfileCommand, ...)
  → IDeviceProvider (WindowsSerialDeviceProvider)
  → ICommandStream (serial port BinaryReader/BinaryWriter)
  → Device (serial packet over USB CDC-ACM)
```

### Device Discovery and Lifecycle

1. **Discovery** — `WindowsSerialDeviceFinder` monitors `WM_DEVICECHANGE` messages for USB hotplug events. It queries WMI (`Win32_PnPEntity`) for devices matching VID=F055, PID=6969 and extracts COM port names.

2. **Identification** — For each discovered COM port, `WindowsSerialDeviceProvider` opens a serial connection and sends the Identify command (index byte `0x00`). The device responds with `DeviceInfo` containing its UUID, type, variant, firmware version, and supported command list.

3. **Command Execution** — The host resolves a command's index from the device's command list, writes the index byte to the serial port, then executes the command's binary protocol. See [serial-protocol.md](serial-protocol.md) for details.

4. **Event Propagation** — Device connect/disconnect events flow through `IObservable<DevicesChangedEvent>` streams, powered by `AsyncDispatchSubject<T>`, up to SSE endpoints that push them to the frontend.

### Event System

`AsyncDispatchSubject<T>` bridges event producers and `System.Reactive` subscribers using a `Channel<T>`. Events are written to the channel from any thread (non-blocking), and a dedicated background task dispatches them to `Subject<T>` subscribers. This prevents slow subscribers from blocking device I/O.

The `/api/devices/events` SSE endpoint subscribes to `IDeviceService.OnDevicesChanged` and streams events to the frontend. A 30-second keepalive heartbeat (`: keepalive\n\n`) detects stale connections. If a write fails, the connection is closed via cancellation.

### Frontend Hosting

**Development:** The React app runs on Vite's dev server (`localhost:5173`) with hot module replacement. The backend at `localhost:7000` allows CORS from this origin. `appsettings.Development.json` configures the frontend URL.

**Production:** MSBuild targets run `npm install && npm run build` during `dotnet publish`, copying the React build output into `wwwroot/`. The backend serves it as static files with SPA fallback routing — non-API, non-file requests rewrite to `/index.html` for client-side routing.

## Firmware Architecture

### Hardware: CK1-30

| Spec | Value |
|------|-------|
| MCU | RP2040 (Raspberry Pi Pico) |
| Keys | 30-key matrix (5 rows x 6 columns) + up to 32 virtual keys |
| Flash | 2 MB total, 500 KB allocated (4 KB settings + 496 KB profile) |
| Heap | 96 KB |
| Row pins (output) | GPIO 28, 27, 26, 22, 21 |
| Column pins (input) | GPIO 16, 17, 9, 18, 19, 20 |
| Debounce | 10 ms |
| Scan interval | 1 ms |

### Flash Memory Layout

| Offset | Size | Purpose |
|--------|------|---------|
| 0x0 | 4 KB | Device settings |
| 0x1000 | 496 KB | Keyboard profile |

### Task Model

The firmware runs on the Embassy async executor with four concurrent tasks:

1. **keypad_task** — Scans the key matrix every tick, manages keyboard state (physical + virtual keys), evaluates active layers based on tags, executes macros, and generates HID reports. Listens for profile, tag, and virtual key updates via signals.

2. **cmd_task** — Serial command processing loop. Reads a command index byte, dispatches to the matching command handler, and handles error recovery by draining buffered serial data on failure.

3. **hid_task** — Waits for `HID_SIGNAL`, then distributes HID reports (keyboard, mouse, consumer control) to the appropriate USB endpoints. Has a `no_mouse` variant when mouse input is disabled.

4. **usb_task** — Main USB device loop handling enumeration and control requests.

### Inter-task Communication

Tasks communicate via lock-free Embassy signals:

| Signal | Data | Producer → Consumer |
|--------|------|---------------------|
| `HID_SIGNAL` | HID report | keypad_task → hid_task |
| `PROFILE_CHANGED_SIGNAL` | `KeyboardProfile` | cmd_task → keypad_task |
| `EXTERNAL_TAGS_CHANGED_SIGNAL` | `Vec<LayerTag>` | cmd_task → keypad_task |
| `VIRTUAL_KEY_SIGNAL` | `[u8; N]` bitfield | cmd_task → keypad_task |

### USB Endpoints

| Endpoint | Type | Packet Size |
|----------|------|-------------|
| Keyboard | HID (NKRO) | 32 bytes |
| Mouse | HID | 32 bytes |
| Consumer Control | HID | 32 bytes |
| Serial | CDC-ACM | 64 bytes |

### Key Matrix and State Machine

The `KeyboardState` tracks:
- Physical key states (pressed/released per key ID)
- Virtual key states (bitfield, up to 32 keys)
- Active layer tags (from host application associations)
- Running macro instances (concurrent execution)

On key press: resolve key → find active layer (matching tags or default) → start macros. On key release: stop macros for that key. Layer selection evaluates `TaggedDeviceKeyLayer` entries with `Any` or `All` match semantics.

### Profile and Macro Execution

Each key (physical or virtual) has a `DeviceLayers` structure containing tag-conditional layers and a default layer. Each layer references macros by index into the profile's macro table.

Macros have three sequences:
- **Start** — Executes immediately on key press
- **Loop** — Repeats while the key is held
- **End** — Executes on key release

Actions within sequences can include keyboard events, mouse events, consumer control, layer tag operations, and debug logging, each with an optional predelay.

Macros support **channels** for coordination: when a macro begins, it will stop any other macros that have their `play_channel` contained in the pressed macro's `cut_channels`.

### cardboard-lib Modules

| Module | Purpose |
|--------|---------|
| `command` | Async command trait and all command implementations |
| `context` | Runtime context: capability traits + concrete `Context` struct |
| `device` | Device identification types (UUID-based) |
| `profile` | Profile structures: keys, layers, macros, actions |
| `state` | Keyboard state machine and macro execution |
| `hid` | NKRO keyboard, mouse, consumer control report generation |
| `input` | Key matrix scanning with debounce |
| `storage` | Flash memory traits and partition management |
| `serial` | Buffered serial packet reader/writer |
| `stream` | Async read/write traits and primitive encoding |
| `serialize` | `Readable` / `Writeable` traits for binary serialization |
| `embassy` | Embassy runtime trait implementations |
| `tasks` | `keypad_task` and `cmd_task` core loops |
| `error` | Lock-free error logging |
| `time` | Clock and duration abstractions |

### Bootloader Entry

The RP2040 USB bootloader can be entered via:
- Holding KEY[0] at power-on
- Serial command from host (`RebootCommand` with mode `0x20`)

## Frontend Architecture

### Tech Stack

- React 19, TypeScript 5.7
- Vite 6 (build tool, dev server with HMR)
- Tailwind CSS 4
- React Router 7 (client-side routing)
- SWR 2 (data fetching with caching)
- @rjsf/core (JSON schema form generation)

### Component Organization

```
react-frontend/src/
├── api/            	# API client functions (fetch wrappers per endpoint group)
├── pages/          	# Route-level page components (Dashboard, Devices, Associations, Logs)
├── components/     	# UI components (profile editor, firmware update dialogs, action views)
│   ├── actionViews/    # Per-action-type renderers (keyboard, mouse, layer, etc.)
│   ├── editProfile/    # Profile editing panels (bindings, layers, macros, tags)
│   └── templates/      # Macro templates (basic, rapid fire)
├── hooks/          	# Custom hooks (firmware update, SSE streaming, navigation guards)
├── lib/            	# Shared utilities (editing context, JSON import/export)
└── App.tsx         	# Root component with router
```

### Build Integration

In development, the frontend and backend run independently. The frontend reads `VITE_API_URL` (defaulting to `http://localhost:7000/`) for API requests.

In production, the .NET build process runs `npm install && npm run build` and copies the output into `wwwroot/`, creating a single self-contained deployment. See [Getting Started](../README.md#getting-started) for development setup.
