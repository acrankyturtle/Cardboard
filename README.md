# Cardboard

Programmable keyboard controller system with host software, configuration UI, and embedded firmware.

## Architecture Overview

Cardboard is a three-tier system: a **React frontend** for configuration, a **.NET backend** for device management and API serving, and **Rust firmware** running on RP2040-based keyboard controllers. The backend discovers devices over USB serial, while the frontend communicates with the backend over HTTP (REST + SSE).

```
Frontend (React/Vite)  →  Backend (.NET/Kestrel)  →  Device (Rust/Embassy)
```

## Prerequisites

- [.NET SDK 10.0+](https://dotnet.microsoft.com/download)
- [Node.js LTS](https://nodejs.org/) + npm
- [Rust nightly](https://rustup.rs/) + `thumbv6m-none-eabi` target
- `elf2uf2-rs` or `probe-rs` (for flashing firmware)
- [Inno Setup 6.2+](https://jrsoftware.org/isinfo.php) (installer builds only)

## Getting Started

### Backend

```bash
dotnet run --project Cardboard.Controller
```

Starts the API server at `http://localhost:7000`. In Development mode, Swagger is available at `/swagger`.

### Frontend

```bash
cd react-frontend
npm install
npm run dev
```

Starts the Vite dev server at `http://localhost:5173`. The `appsettings.Development.json` in `Cardboard.Controller/` points `ReactHostUrl` to `:5173` so the backend knows where the frontend is running.

### Firmware

```bash
cd firmware
cargo build --release
cargo run --release
```

Flashes the firmware to a connected RP2040 device. The default runner uses `elf2uf2-rs` (device must be in bootloader mode). To use `probe-rs`, edit `.cargo/config.toml`.

## Building for Release

### Application

```bash
dotnet publish Cardboard.Controller -c Release
```

This automatically builds the React frontend (`npm install && npm run build`) and bundles it into the output under `wwwroot/`.

### Installer

```powershell
installer\build-installer.ps1
```

Requires Inno Setup 6.2+ installed.

### Firmware

```bash
cd firmware
cargo build --release
```

## Project Structure

### Host Application (C# / .NET 10)

| Project | Purpose |
|---------|---------|
| `Cardboard.Controller/` | ASP.NET Core host, DI composition root, entry point |
| `Cardboard.HttpApi/` | REST API endpoint definitions (Devices, Tags, Logs, InputDevices, Controller) |
| `Cardboard.Api/` | Shared API setup, such as JSON serialization configuration |
| `Cardboard.FrontendHost/` | SPA hosting, origin validation, route mounting |
| `Cardboard.Services/` | Business logic: tag association management, virtual key dispatch |
| `Cardboard.Repositories/` | Data access: device repository, association persistence |
| `Cardboard.Events/` | Cross-platform event abstractions |
| `Cardboard.Device/` | Device abstractions: commands, profiles, settings, binary serialization |
| `Cardboard.Serial/` | Serial port abstractions |
| `Cardboard.Windows/` | Windows: serial discovery (WMI), input monitoring, tray icon |
| `Cardboard.Metadata/` | Device metadata interfaces (icons, model info) |
| `Cardboard.Utilities/` | Shared utilities: AsyncDispatchSubject, Result types, file watcher |
| `Cardboard.Update/` | Firmware update orchestration |
| `Cardboard.Update.Api/` | Update server API client |
| `Cardboard.Update.Api.Abstractions/` | Shared types for update client/server |
| `Cardboard.UpdateServer/` | Firmware, metadata, and update distribution server (separate deployment) |

### Firmware (Rust / Embassy)

| Directory | Purpose |
|-----------|---------|
| `firmware/` | CK1-30 firmware entry point and RP2040-specific code |
| `cardboard-lib/` | Platform-agnostic core: commands, profiles, state machine, HID, serial |

### Frontend (TypeScript / React 19)

| Directory | Purpose |
|-----------|---------|
| `react-frontend/` | Vite + React + Tailwind SPA for device configuration |

### Tooling

| Directory | Purpose |
|-----------|---------|
| `DeviceTool/` | CLI tool for building and testing device profiles |
| `installer/` | Inno Setup installer scripts and build script |

## Configuration

**`Cardboard.Controller/appsettings.json`** — Production configuration:

- `Kestrel:Endpoints:Http:Url` — Backend listen address (default `http://127.0.0.1:7000`)
- `Paths:Associations` — Association storage path (default `%APPDATA%/Cardboard/associations.json`)
- `Paths:MetadataCache` / `IconCache` — Cache directories under `%APPDATA%/Cardboard/cache/`
- `Frontend:ReactHostUrl` — URL where the frontend is served from
- `Update:Url` / `Update:Channel` — Firmware update server and release channel

**`appsettings.Development.json`** — Development overrides:

- Sets `Frontend:ReactHostUrl` to `http://localhost:5173` for the Vite dev server
- Sets `Update:Channel` to `preview`

## Code Formatting

| Language | Tool | Config |
|----------|------|--------|
| C# | CSharpier | `.csharpierrc.json` (tabs, 110 width) |
| TypeScript | Prettier + ESLint | `.prettierrc`, `eslint.config.js` |
| Rust | rustfmt | Default settings |

## Further Documentation

- [Architecture](docs/architecture.md) — System architecture deep-dive, component relationships, data flow
- [API Reference](docs/api-reference.md) — HTTP endpoint reference (REST + SSE)
- [Serial Protocol](docs/serial-protocol.md) — Binary protocol between host and firmware
- [Conventions](docs/conventions.md) — Design patterns, code style, project conventions
