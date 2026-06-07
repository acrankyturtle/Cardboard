# Serial Protocol

Binary protocol between the host application and device firmware over USB serial.

## Transport

Communication uses a **CDC-ACM USB serial** interface. Data is exchanged in **64-byte packets**. The firmware uses a buffered reader (`BufferedReader<S>`) that reassembles packets into a byte stream, so logical messages can span multiple packets.

All multi-byte integers are **little-endian**.

## Command Dispatch

### Host to Device

1. The host sends an **Identify** command to discover the device and its supported command list.
2. Each command in the list has a UUID (`CommandId`). The host resolves the command's **index** (position in the list) using `Command.GetCommandIndex(deviceInfo, commandId)`.
3. To invoke a command, the host writes a single **u8 index byte** to the serial port, then executes the command's binary protocol.

```
Host → Device:  [command_index: u8] [command-specific payload...]
Device → Host:  [command-specific response...]
```

### Firmware Side

The `cmd_task` loop reads one byte (the command index), looks up the command in a `Vec<Box<dyn Command<Context>>>`, and calls `execute`. On error, the firmware drains buffered serial packets for a timeout period to resynchronize.

## Primitive Encoding

| Type | Size | Encoding |
|------|------|----------|
| `u8` | 1 | Raw byte |
| `u16` | 2 | Little-endian |
| `u32` | 4 | Little-endian |
| `u64` | 8 | Little-endian |
| `i32` | 4 | Little-endian, two's complement |
| `bool` | 1 | `0x00` = false, non-zero = true |
| `UUID` | 16 | Little-endian GUID bytes |
| `StringU8` | 1 + N | u8 length prefix + UTF-8 bytes |
| `StringU16` | 2 + N | u16 length prefix + UTF-8 bytes |
| `CollectionU8<T>` | 1 + N*sizeof(T) | u8 count + N serialized items |
| `CollectionU16<T>` | 2 + N*sizeof(T) | u16 count + N serialized items |
| `Option<T>` | 1 [+ sizeof(T)] | bool prefix; if true, followed by T |

## Commands

### Identify

**UUID:** `ffffffff-ffff-ffff-ffff-ffffffffffff`

The first command sent to a new device. Always at index 0.

**Request:** (no payload beyond the index byte)

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| version | u32 | Protocol version (currently `1`) |
| id | UUID | Device unique identifier |
| manufacturer | StringU8 | Manufacturer name |
| type | UUID | Device type identifier |
| variant | Option\<StringU8\> | Hardware variant (e.g. "BLK", "WHT") |
| version | 3 x u8 | Firmware version (major, minor, revision) |
| commands | CollectionU8\<CommandInfo\> | Supported commands |

Each `CommandInfo`:

| Field | Type |
|-------|------|
| id | UUID |
| name | StringU8 |

### GetProfile

**UUID:** `e8dfdb54-f01c-5f79-9bb7-7d8d0c0c82d1`

**Request:** (no payload)

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| is_valid | u8 | `0xFF` if profile exists, `0x00` otherwise |
| length | u16 | Profile data byte count |
| data | raw bytes | Profile binary data (sent in 64-byte chunks) |

### UpdateProfile

**UUID:** `45963fd8-73e2-50a0-ba69-69c3333dd8af`

**Request:**

| Field | Type | Description |
|-------|------|-------------|
| length | u16 | Profile data byte count |
| data | raw bytes | Profile binary data (sent in 64-byte chunks) |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| result | u8 | `0xFF` = success, other = error code |

Error codes:
- `0x10` - Failed to read profile length
- `0x14` - Failed to read profile chunk from serial
- `0x20` - Failed to erase flash storage
- `0x24` - Failed to write profile length to flash
- `0x28` - Failed to write profile data to flash
- `0x2C` - Failed to deserialize profile from flash

### GetSettings

**UUID:** `0062d411-70a5-55a5-a333-16706d62069f`

**Request:** (no payload)

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| length | u16 | Settings data byte count |
| data | raw bytes | Settings binary data (sent in 64-byte chunks) |

### UpdateSettings

**UUID:** `a2460f18-32a8-5e57-b8c7-7adac7a096bd`

**Request:**

| Field | Type | Description |
|-------|------|-------------|
| length | u16 | Settings data byte count |
| data | raw bytes | Settings binary data (sent in 64-byte chunks) |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| result | u8 | `0xFF` = success, other = error code |

Error codes are the same as UpdateProfile. If the new settings require a hardware reconfiguration, the device reboots automatically after sending the response.

### SetExternalTags

**UUID:** `6d84630b-03ec-57f7-806e-b1c5dee4974d`

Pushes the current set of active tags (from application associations) to the device for layer switching.

**Request:**

| Field | Type |
|-------|------|
| tags | CollectionU8\<LayerTag\> |

Each `LayerTag` is a `StringU8`.

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| result | u8 | `0xFF` = success |

### Reboot

**UUID:** `6dce0823-d199-5abb-a56f-a85cdba61842`

Reboots the device, optionally into USB bootloader mode for firmware updates.

**Request:**

| Field | Type | Description |
|-------|------|-------------|
| mode | u8 | `0x10` = reboot, `0x20` = reboot to bootloader |

**Response:** None (device disconnects immediately).

### GetStatus

**UUID:** `b14aadb5-53a2-5e69-b463-603efce7c199`

Returns runtime diagnostics.

**Request:** (no payload)

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| now | u64 | Current monotonic clock ticks |
| allocator_current | u32 | Current heap bytes allocated |
| allocator_max | u32 | Peak heap bytes allocated |
| errors | CollectionU8\<Error\> | Runtime error log entries |

### SetVirtualKeys (8 keys)

**UUID:** `162d99cc-5e8f-5879-97fc-c37fdb0f22a9`

Sets the state of up to 8 virtual keys using a 1-byte bitfield.

**Request:**

| Field | Type | Description |
|-------|------|-------------|
| state | 1 byte | Bitfield, one bit per virtual key |

**Response:** None.

### SetVirtualKeys (32 keys)

**UUID:** `c1b2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6`

Sets the state of up to 32 virtual keys using a 4-byte bitfield.

**Request:**

| Field | Type | Description |
|-------|------|-------------|
| state | 4 bytes | Bitfield, one bit per virtual key |

**Response:** None.

## Profile Binary Format

The profile is serialized as a versioned blob and stored in flash memory. The on-wire format during GetProfile/UpdateProfile prepends a u16 length.

### DeviceProfile

| Field | Type |
|-------|------|
| version | u32 (must be `1`) |
| name | StringU8 |
| keys | CollectionU8\<DeviceKey\> |
| virtual_keys | CollectionU8\<DeviceVirtualKey\> |
| macros | CollectionU16\<Macro\> |

### DeviceKey

| Field | Type |
|-------|------|
| id | UUID (DeviceKeyId) |
| layers | DeviceLayers |

### DeviceVirtualKey

| Field | Type |
|-------|------|
| layers | DeviceLayers |

### DeviceLayers

| Field | Type |
|-------|------|
| layers | CollectionU8\<TaggedDeviceKeyLayer\> |
| default_layer | DeviceKeyLayer |

### TaggedDeviceKeyLayer

| Field | Type |
|-------|------|
| tags | CollectionU8\<LayerTag\> |
| match_type | u8 (`0` = Any, `1` = All) |
| layer | DeviceKeyLayer |

`LayerTag` is a `StringU8`.

### DeviceKeyLayer

| Field | Type |
|-------|------|
| id | UUID (LayerId) |
| macros | CollectionU8\<MacroIndex\> |

`MacroIndex` is a `u16`.

### Macro

| Field | Type |
|-------|------|
| id | UUID (MacroId) |
| name | StringU8 |
| macro_type | MacroType |
| play_channel | Option\<Channel\> |
| cut_channels | CollectionU8\<Channel\> |
| start_sequence | Sequence |
| loop_sequence | Sequence |
| end_sequence | Sequence |

`MacroType` is a `u8` where `0` = `Momentary` and `1` = `Toggle`.

`Channel` is a `u32` on wire (C# side) / `u8` on firmware side.

### Sequence

| Field | Type |
|-------|------|
| actions | CollectionU8\<Action\> |

### Action

| Field | Type |
|-------|------|
| predelay_ms | u16 |
| action_event | ActionEvent |

### ActionEvent

Discriminated union. First byte selects the variant:

| Discriminator | Variant | Payload |
|---------------|---------|---------|
| `0` | None | (empty) |
| `1` | Keyboard | KeyboardEvent |
| `2` | Mouse | MouseEvent |
| `3` | ConsumerControl | u8 (HID usage code) |
| `4` | Layer | LayerEvent |
| `5` | Debug | DebugEvent |
| `6` | Gamepad | GamepadEvent |

#### KeyboardEvent

| Field | Type | Description |
|-------|------|-------------|
| is_key_down | bool | true = key down, false = key up |
| key | u8 | HID keyboard usage code |

#### MouseEvent

Discriminated union (u8):

| Discriminator | Variant | Payload |
|---------------|---------|---------|
| `0` | ButtonDown | u8 (MouseButton enum: 0=Left, 1=Right, 2=Middle, 3=Back, 4=Forward) |
| `1` | ButtonUp | u8 (MouseButton) |
| `2` | Scroll | i32 x, i32 y |
| `3` | Move | i32 x, i32 y |

#### GamepadEvent

Discriminated union (u8):

| Discriminator | Variant | Payload |
|---------------|---------|---------|
| `0` | ButtonDown | u8 (GamepadButton enum: 0=Button1 … 15=Button16) |
| `1` | ButtonUp | u8 (GamepadButton) |
| `2` | Adjust | GamepadAxisValue |

##### GamepadAxisValue

| Field | Type | Description |
|-------|------|-------------|
| axis | u8 | GamepadAxis enum: 0=LeftX, 1=LeftY, 2=RightX, 3=RightY, 4=LeftTrigger, 5=RightTrigger |
| value | i8 | Axis value, -127 to 127 |

#### LayerEvent

| Field | Type | Description |
|-------|------|-------------|
| discriminator | u8 | `0` = Clear, `1` = Set |
| tag | LayerTag (StringU8) | Tag to set or clear |

#### DebugEvent

| Field | Type |
|-------|------|
| log | StringU8 |

## Settings Binary Format

### DeviceSettings

The settings format is versioned. The leading `version` field selects the field layout that follows. The host and firmware negotiate the version per device so that older firmware (which has no gamepad) continues to round-trip its settings.

**Version 1** (legacy, pre-gamepad firmware):

| Field | Type |
|-------|------|
| version | u32 (`1`) |
| mouse_enabled | bool |
| debounce_time_us | u32 |

**Version 2** (current, gamepad-capable firmware):

| Field | Type |
|-------|------|
| version | u32 (`2`) |
| mouse_enabled | bool |
| gamepad_enabled | bool |
| debounce_time_us | u32 |
