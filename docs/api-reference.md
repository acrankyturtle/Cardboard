# API Reference

HTTP API served by the Cardboard controller backend.

## Conventions

- **Base URL:** `http://localhost:7000/api`
- **JSON:** camelCase property names, null values omitted, enums serialized as strings
- **Swagger:** Available at `/swagger` in Development mode
- **IDs:** Strongly-typed UUIDs serialized as standard GUID strings
- **SSE streams:** `Content-Type: text/event-stream`, no caching, connection keep-alive

## Devices

### GET /api/devices

List all connected devices.

**Response** `200 OK`

```json
{
  "devices": [
    {
      "id": "...",
      "name": "...",
      ...
    }
  ]
}
```

### GET /api/devices/{id}

Get detailed information about a specific device.

**Response** `200 OK` | `404 Not Found`

```json
{
  "deviceDetails": { ... }
}
```

### GET /api/devices/{id}/profile

Get the current key profile for a device.

**Response** `200 OK` | `404 Not Found`

```json
{
  "deviceProfile": { ... }
}
```

### PUT /api/devices/{id}/profile

Update the key profile for a device. The profile is serialized to the binary format and sent to the device over serial.

**Request body:** `Profile` JSON object

**Response** `204 No Content` | `400 Bad Request` (invalid profile) | `404 Not Found` | `500 Internal Server Error` (device communication error)

### GET /api/devices/{id}/settings

Get device settings.

**Response** `200 OK` | `404 Not Found`

```json
{
  "deviceSettings": {
    "version": 2,
    "mouseEnabled": true,
    "gamepadEnabled": true,
    "supportsGamepad": true,
    "debounceTimeUs": 10000
  }
}
```

`supportsGamepad` is derived from the settings `version` (true for version 2+) and indicates whether the device's firmware exposes the `gamepadEnabled` toggle. Older firmware reports version 1 with no `gamepadEnabled` field.

### PUT /api/devices/{id}/settings

Update device settings. May cause a device reboot if hardware-affecting settings changed.

**Request body:** `DeviceSettings` JSON object

**Response** `204 No Content` | `404 Not Found` | `500 Internal Server Error`

### POST /api/devices/{id}/bootloader

Reboot a device into USB bootloader mode for firmware updates.

**Response** `204 No Content` | `404 Not Found`

### POST /api/devices/{id}/update

Update firmware on a specific connected device. Returns an SSE stream of progress events.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `migrate` | bool | Whether to backup and restore profile/settings across the update |
| `version` | string? | Target firmware version (latest if omitted) |

**Response** `200 OK` (`text/event-stream`) — see [Firmware Update Events](#firmware-update-events)

### POST /api/devices/update

Flash firmware to a device already in USB bootloader mode. Returns an SSE stream of progress events.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `deviceType` | UUID | Device type identifier |
| `variant` | string? | Hardware variant |
| `version` | string? | Target firmware version (latest if omitted) |

**Response** `200 OK` (`text/event-stream`) — see [Firmware Update Events](#firmware-update-events)

### GET /api/devices/events

SSE stream of device connect/disconnect events.

**Response** `200 OK` (`text/event-stream`)

On connect: `: connected\n\n`

Every 30 seconds: `: keepalive\n\n`

Named events:

```
event: devicesChanged
data: {"added":["<device-id>"],"removed":["<device-id>"]}
```

### GET /api/devices/firmware

List available firmware versions.

**Response** `200 OK`

```json
{
  "firmware": [
    {
      "deviceTypeId": "...",
      "name": "CK1-30 (black)",
      "variant": "BLK",
      "latestVersion": "1.2.3"
    }
  ]
}
```

### GET /api/devices/bootloader

Check if a device in bootloader mode is detected.

**Response** `200 OK`

```json
{
  "available": true
}
```

## Tags

Application-to-tag associations. Tags drive layer switching on the device when the associated application is in focus.

### GET /api/tags

List all tag associations.

**Response** `200 OK`

```json
{
  "associations": [ ... ]
}
```

### POST /api/tags

Create a new tag association.

**Request body:** `ApplicationAssociationData` JSON object

**Response** `200 OK`

```json
{
  "id": "..."
}
```

### GET /api/tags/{id}

Get a specific tag association.

**Response** `200 OK` | `404 Not Found`

```json
{
  "association": { ... }
}
```

### PUT /api/tags/{id}

Update a tag association.

**Request body:** `ApplicationAssociationData` JSON object

**Response** `204 No Content` | `404 Not Found`

### DELETE /api/tags/{id}

Delete a tag association.

**Response** `204 No Content` | `404 Not Found`

## Input Devices

### GET /api/input-devices

List detected input devices (e.g. mice, gamepads) that can be used for virtual key bindings.

**Response** `200 OK`

```json
{
  "devices": [ ... ]
}
```

## Logs

### GET /api/logs

Get device communication log entries.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int? | Maximum number of entries to return |
| `since` | DateTimeOffset? | Only return entries after this timestamp |

**Response** `200 OK`

```json
{
  "entries": [ ... ]
}
```

### DELETE /api/logs

Clear all log entries.

**Response** `204 No Content`

## Controller

### GET /api/controller/version

Get the running controller application version.

**Response** `200 OK`

```json
{
  "version": "1.0.0"
}
```

### GET /api/controller/update

Check if a newer controller version is available.

**Response** `200 OK`

```json
{
  "currentVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "updateAvailable": true,
  "downloadUrl": "https://..."
}
```

## Firmware Update Events

The `POST /api/devices/{id}/update` and `POST /api/devices/update` endpoints return SSE streams with JSON payloads. Each event is a `data:` line containing a polymorphic JSON object with a `type` discriminator.

### Progress

```json
{"type": "progress", "stage": "EnteringBootloader"}
```

Stages represent the current step in the update process.

### Success

```json
{"type": "success", "alreadyUpToDate": false}
```

### Error

```json
{
  "type": "error",
  "result": "DeviceNotFound",
  "message": "The specified device was not found."
}
```

Possible error results: `DeviceNotFound`, `FirmwareNotFound`, `DeviceAlreadyInBootloader`, `DeviceTypeMismatch`, `DeviceVariantMismatch`, `FailedToGetProfile`, `FailedToRestoreProfile`, `FailedToGetSettings`, `FailedToRestoreSettings`, `FailedToEnterBootloader`, `FailedToFindBootloader`, `DeviceNotReconnected`, `UnknownError`.
