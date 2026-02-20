# CK1-30 Device Guide

This guide covers hardware details and device-specific information for the CK1-30. For general Cardboard usage, see the [main user guide](GUIDE.md).

## Overview

The CK1-30 is a 30-key programmable Cardboard keypad built on the RP2040 microcontroller. It connects to your computer over USB and appears as a composite device with keyboard, mouse, consumer control, and serial communication endpoints.

### Specifications

| Spec | Details |
|------|---------|
| Keys | 30 physical keys (5 rows x 6 columns) |
| Virtual Keys | Up to 32 |
| Microcontroller | RP2040 (dual-core Arm Cortex-M0+) |
| Connection | USB 2.0 (composite device) |
| USB Endpoints | NKRO Keyboard, Mouse, Consumer Control, CDC Serial |
| Profile Storage | Flash memory |
| Key Debounce | 10 ms (default, configurable) |
| Scan Rate | 1 ms |

## Key Layout

The CK1-30 has a 5-row by 6-column key matrix:

```
 ┌─────┬─────┬─────┬─────┬─────┬─────┐
 │     │     │     │     │     │     │  Row 1
 ├─────┼─────┼─────┼─────┼─────┼─────┤
 │     │     │     │     │     │     │  Row 2
 ├─────┼─────┼─────┼─────┼─────┼─────┤
 │     │     │     │     │     │     │  Row 3
 ├─────┼─────┼─────┼─────┼─────┼─────┤
 │     │     │     │     │     │     │  Row 4
 ├─────┼─────┼─────┼─────┼─────┼─────┤
 │     │     │     │     │     │     │  Row 5
 └─────┴─────┴─────┴─────┴─────┴─────┘
  Col 1  Col 2  Col 3  Col 4  Col 5  Col 6
```

Each key has a unique identity stored in the device firmware. The visual key layout in the Cardboard profile editor accurately reflects the physical arrangement of your specific CK1-30, including any key size or color variations.

## Variants

The CK1-30 comes in hardware variants (e.g. BLK, WHT) that may have cosmetic differences. The variant is reported in the device details dialog in Cardboard. Firmware updates are variant-specific — Cardboard handles this automatically and will not flash firmware intended for a different variant.

## USB Composite Device

The CK1-30 presents itself as a USB composite device with multiple endpoints:

- **Keyboard (NKRO)** — Full N-Key Rollover keyboard for keystroke output.
- **Mouse** — Mouse buttons, scroll, and cursor movement. Can be disabled in device settings if needed for anti-cheat compatibility.
- **Consumer Control** — Media keys (volume, playback, etc.).
- **CDC Serial** — Communication channel between Cardboard and the device for profile management, settings, and firmware updates.

## Device-Specific Notes

### Flash Storage

Profiles and settings are stored in the RP2040's onboard flash memory. The profile partition provides approximately 496 KB of storage, which is sufficient for complex profiles with many macros and layers. Settings occupy a separate 4 KB partition.

### Bootloader Mode

The RP2040 has a built-in USB bootloader. During firmware updates, Cardboard automatically reboots the device into bootloader mode, where it appears as a USB mass storage device. The new firmware is copied to this drive, and the device reboots with the updated firmware.

If you ever need to manually enter bootloader mode, hold the top-left most key while pluggin in the USB cable. Alternatively, you can also hold the BOOTSEL button on the RP2040 board while plugging in the USB cable. The device will appear as a removable drive named "RPI-RP2".

### Supported HID Features

All macro action types are supported on the CK1-30:

- **Keyboard** — Full key set including modifiers (Ctrl, Shift, Alt, GUI/Win), function keys (F1–F24), numpad, navigation, and special keys.
- **Mouse** — Left, Right, Middle, Back, and Forward buttons; scroll; cursor movement. Requires mouse output to be enabled in device settings (default is ON).
- **Consumer Control** — Play/Pause, Mute, Volume Up/Down, Next/Previous Track, Stop, Record, Fast Forward, Rewind, Eject.
- **Layer** — Set and clear tags to switch layers on the device itself.
