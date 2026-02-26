# Cardboard User Guide

Cardboard is a desktop application for configuring programmable keypads. It lets you create profiles with custom macros, layers, and bindings so every key on your device does exactly what you want — and automatically switches behavior based on which application you're using.

This guide covers all the shared concepts and features. For hardware-specific details, see the device guide for your keypad (e.g. [CK1-30 Guide](GUIDE-CK1-30.md)).

## How It All Fits Together

Before diving into individual features, here's the big picture of how Cardboard's concepts relate to each other:

- A **profile** lives on your device and contains all of its key configuration: which keys do what, organized into macros and layers.
- A **macro** is an action sequence that fires when you press a key — it can type keys, click mouse buttons, send media commands, or switch layers.
- Each key has **layers**. Layers let a single key do different things depending on context. One layer is the **default** (always active); others are **tagged layers** that activate when specific tags are present.
- **Tags** are simple string labels (like `gaming` or `photoshop`) that control which layers are active. Tags can come from two sources: **associations** (set automatically based on the focused application) or **macro actions** (set/cleared manually by pressing keys).
- **Associations** watch which application is in the foreground and automatically apply tags (and optionally set up virtual keys) when a match is detected.
- **Virtual keys** are software-triggered keys on your device. They don't correspond to physical buttons — instead, they're activated by input from other devices (like a mouse click or keyboard shortcut) via associations. This allows you to trigger Cardboard's powerful macros through other devices on your system.

**The flow in practice:** You focus an application → an association matches the process path → its tags activate → tagged layers switch in on your device → your keys now fire different macros. All of this happens automatically and instantly.

## The Interface

Cardboard's UI has three main pages, accessible from the sidebar:

- **Dashboard** — An overview showing connected devices, association counts, tag counts, virtual binding counts, and quick-action buttons.
- **Devices** — Lists your connected devices. From here you can view device details, edit profiles, change device settings, and update firmware.
- **Associations** — Manage application-to-device associations, including tag assignments and virtual key bindings.

## Getting Started

### Connecting a Device

Plug your keypad into a USB port. Cardboard discovers devices automatically — no pairing or driver installation required. Once connected, the device appears on the Dashboard and Devices pages with a green "Connected" indicator.

### Your First Look Around

From the **Dashboard** you can see at a glance how many devices are connected, how many associations you have, and jump to common tasks via the Quick Actions panel:

- **Manage Devices** — Go to the Devices page.
- **Edit Associations** — Go to the Associations page.
- **Configure Keys** — Jump straight into the profile editor for a connected device.

## Profiles

A profile is the container for all key configuration stored on a device. It includes:

- All physical and virtual key bindings
- All macros
- All layer definitions

### Editing a Profile

From the **Devices** page, click the edit button on a device to open the profile editor. The editor is organized into several panels:

- **Tags** (left) — Shows all tags used across the profile. Select tags here to preview which layers would be active for those tags.
- **Keys** (left) — Lists all physical and virtual keys. Click a key to select it for editing. You can also click directly on the visual key layout in the center of the screen.
- **Layers** (top-right) — Shows the layers for the currently selected key. You'll see the default layer and any tagged layers. Click a layer to select it.
- **Bindings** (bottom-right) — Shows which macros are bound to the selected key on the selected layer. Add or remove macro bindings here.
- **Macros** (right) — Lists all macros in the profile. Create, edit, delete, import, and export macros from here.

### Saving Changes

After editing, click **Save** in the header to write the profile to the device. The profile is stored in the device's flash memory and persists across power cycles.

### Import & Export

You can export your entire profile to a JSON file and import it later (or share it with others). Use the **Import Profile** and **Export Profile** buttons in the profile editor header.

## Keys & Bindings

### Physical and Virtual Keys

Your device has a fixed number of physical keys (determined by the hardware) plus up to 32 **virtual keys**. Physical keys correspond to buttons you press; virtual keys are triggered by software through associations.

In the profile editor, the Keys panel lets you toggle between viewing physical keys and virtual keys.

### Selecting a Key

Click a key in the key list or on the visual layout to select it. The Layers and Bindings panels update to show that key's configuration.

### Assigning Macros

To make a key do something, you assign one or more macros to it through **bindings**:

1. Select a key.
2. Select a layer (the default layer, or a tagged layer).
3. In the Bindings panel, click the add button and choose a macro.

You can also drag a macro from the Macros panel and drop it on a layer or the Bindings panel to create a binding in one step.

When multiple macros are bound to the same key on the same layer, all of them fire when the key is pressed.

### How Bindings Interact with Layers

Each key independently determines its active layer based on the current tags. When you press a key, only the macros bound to its currently active layer fire. See the [Layers](#layers) section for details.

## Macros

A macro is a named sequence of actions with timing control. When a key fires a macro, the device executes actions in order — pressing keys, clicking mouse buttons, sending media commands, or switching layers.

### The Three Phases

Every macro has three sequences that execute in order:

1. **Start** — Runs once when the key is first pressed.
2. **Loop** — Repeats continuously while the key is held down. If empty, nothing happens during the hold.
3. **End** — Runs once when the key is released.

The Start and End sequences will *always* run, but the Loop sequence will not run if the key is released before the Start sequence completes. Sequences will always run to completion, so if you release a key in the middle of the Loop sequence, the Loop sequence will finish, and then the End sequence will run.

### Action Types

Each action in a sequence is one of:

- **Keyboard** — Press or release a keyboard key. Supports all standard keys (A–Z, 0–9, F1–F24, modifiers, arrows, numpad, etc.).
- **Mouse** — Press or release a mouse button (Left, Right, Middle, Back, Forward), scroll, or move the cursor.
- **Consumer Control** — Send a media command: Play/Pause, Mute, Volume Up/Down, Next/Previous Track, Stop, Record, Fast Forward, Rewind, Eject.
- **Layer** — Set or clear a tag, which activates or deactivates tagged layers. See [Layers](#layers).

### Pre-delay

Each action has an optional **pre-delay** (in milliseconds) that adds a wait before the action executes. Use this to control timing within a sequence — for example, adding a delay between pressing and releasing a key to simulate a held keystroke.

### Templates

The macro editor offers two templates for common patterns:

- **Basic** — A simple press-and-release macro. You pick the keys/buttons, and the template generates a Start sequence (key down events) and End sequence (matching key up events) with an empty Loop. Good for simple key remapping or modifier combos.
- **Rapid Fire** — A repeating macro. You pick the keys/buttons and set two timing values: **Press Duration** (how long to hold each press) and **Wait Between** (how long to pause between presses). The template generates all three phases so the action repeats as long as you hold the key.

### Play Channels and Cut Channels

Channels let you coordinate macros to prevent conflicts:

- **Play Channel** — Optionally assign a macro to a numbered channel. This identifies what "slot" the macro plays in.
- **Cut Channels** — A list of channels that this macro will interrupt when it starts playing. Any macro currently playing on a listed channel is stopped as if the key were released.

For example, you could assign several macros to channel 1 and give each one a cut channel of 1 — that way, pressing any of those keys stops the previously playing macro when starting the new one.

### Copying, Importing, and Exporting Macros

From the Macros panel you can:

- **Copy** a macro to your clipboard (as JSON).
- **Paste** a macro from your clipboard.
- **Import** a macro from a `.json` file.
- **Export** a macro to a `.json` file (saved as `{MacroName}-macro.json`).

Imported and pasted macros are assigned a new identity, so they won't conflict with existing macros.

## Layers

Layers let a single key behave differently depending on context. Each key has its own independent set of layers.

### The Default Layer

Every key has exactly one **default layer**. This is the baseline — it's what the key does when no tagged layer matches. The default layer is always present and can't be removed.

### Tagged Layers

In addition to the default, you can add **tagged layers** to a key. Each tagged layer has:

- **Tags** — One or more tag strings (e.g. `gaming`, `photoshop`).
- **Match Type** — Either **Any** (the layer activates if *any* of its tags are present) or **All** (the layer activates only if *every* tag is present).

When a key is pressed, the device checks the currently active tags against the key's tagged layers. The first tagged layer that matches is used; if none match, the default layer is used.

### Creating and Managing Layers

In the Layers panel (with a key selected):

- Click the add button to create a new tagged layer. You'll be asked to specify its tags and match type.
- Click a layer to select it and view/edit its bindings.
- Drag-and-drop layers to reorder them and control matching priority — the first matching tagged layer wins.
- Delete tagged layers you no longer need.

### Previewing Layers

Use the Tags panel on the left to select tags and preview which layers would be active for each key. This is a useful way to verify your layer setup without actually switching applications.

## Tags

Tags are simple string identifiers (like `gaming`, `discord`, `editing`) that bridge layers and associations. They're the mechanism that makes context-aware key behavior work.

### How Tags Connect Layers to Associations

The connection works like this:

1. An **association** defines which tags to activate when a particular application is focused.
2. Those tags are sent to your device.
3. Each key checks its **tagged layers** against the active tags.
4. The first matching layer determines what macros fire.

### Setting and Clearing Tags via Macro Actions

Beyond associations, you can also control tags with **Layer actions** in macros:

- **Set** a tag — Adds a tag to the active tag list, potentially activating tagged layers.
- **Clear** a tag — Removes a tag from the active tag list.

This lets you create "mode switch" keys — for example, a key that toggles a `numpad` tag, causing all your keys to switch to a numpad layer.

Tags set via macro actions and tags set via associations coexist. The device merges both sources when determining which layers are active.

### Viewing Tags in the Editor

The Tags panel in the profile editor shows all tags referenced anywhere in the profile. You can select tags to preview how layers would resolve, making it easier to design and test complex layer setups.

## Associations

Associations connect running applications on your computer to your device. They let Cardboard automatically adjust your keypad's behavior based on what you're doing.

### How They Work

Cardboard monitors which application window is focused. When the foreground application changes, it checks the process path against your associations' **match paths**. If a match is found, the association's tags are activated on all connected devices.

### Match Paths

Each association has one or more **match paths** — substrings that are compared against the focused application's process path. The matching is case-insensitive. For example:

- `photoshop` would match `C:\Program Files\Adobe\Photoshop\photoshop.exe`
- `discord` would match `C:\Users\You\AppData\Local\Discord\app-1.0\discord.exe`
- `C:\Games\` or `\steamapps\common\` would match `C:\Games\steamapps\common\Halo The Master Chief Collection\MCC\Binaries\Win64\MCC-Win64-Shipping.exe`

Enter one match path per line in the editor.

It is possible for multiple associations to match to the active application.

### Assigning Tags

Each association has a list of tags. When the association matches, all of its tags become active. These are the same tags that tagged layers reference, so activating a tag via an association causes matching layers to switch in on your device.

### Virtual Key Bindings

Associations can also configure **virtual key bindings**, which map input from other devices (like a keyboard or mouse) to virtual keys on your keypad. Each virtual key binding specifies:

- **Target Device** — Which Cardboard device receives the virtual key press.
- **Virtual Key** — Which virtual key slot (VK1 through VK32) to activate.
- **Input Key** — Which physical key or button triggers the virtual key (e.g. Left Click, F13, Scroll Up).
- **Device Matching Filters** — Optional filters to narrow down which input device is listened to:
  - **VID** (Vendor ID)
  - **PID** (Product ID)
  - **Serial** number
  - **Description**

  All specified filters must match (AND logic). Leave a filter empty to match any value.

To see the VID, PID, Serial, and Description of your attached input devices, click **"View attached input devices"** in the association editor.

### Import & Export

You can export all associations to a JSON file and import them on another machine or after reinstalling. Use the **Import** and **Export** buttons at the top of the Associations page.

## Virtual Keys

Virtual keys are software-triggered keys on your device. Unlike physical keys, they don't correspond to a button you press on the keypad — instead, they're activated remotely via association virtual key bindings.

### How They Work

1. You create an association with a virtual key binding that maps an input (e.g. a mouse button on a specific mouse) to a virtual key slot (e.g. VK1) on your device.
2. When the association is active (its match paths match the focused application) and you press the mapped input, Cardboard sends a virtual key press to your device.
3. The device treats the virtual key just like a physical key — it checks layers and fires the bound macros.

### Configuring Virtual Keys

Virtual keys support the same layer and macro system as physical keys. In the profile editor, switch to the virtual keys view in the Keys panel, select a virtual key, and configure its layers and bindings just like you would for a physical key.

### Use Cases

- **Application-specific mouse buttons** — Map mouse side buttons to trigger device macros only in certain applications.
- **Cross-device input** — Use a key on one keyboard to trigger macros on your keypad.
- **Conditional triggers** — Because virtual key bindings are part of associations, they only work when the matching application is focused.

## Device Settings

Access device settings from the Devices page by clicking the settings button on a device.

### Mouse Enable/Disable

The device can present itself as a USB mouse. Some games with anti-cheat software (such as Vanguard) may flag composite USB devices that include a mouse endpoint. If you encounter issues, you can **disable mouse output** in device settings.

When mouse output is disabled, any mouse actions in your macros will have no effect. The profile editor shows a warning indicator on macros containing mouse actions when mouse output is disabled.

**Note:** Changing this setting requires the device to reboot, as it changes the USB device descriptor.

## Firmware Updates

Cardboard checks for firmware updates automatically. When an update is available, you'll see an update indicator on the Devices page and in the device details dialog.

### Updating Firmware

1. Open the device details dialog from the Devices page.
2. If an update is available, click the **Update** button.
3. Cardboard will:
   - Back up your current profile and settings.
   - Reboot the device into bootloader mode.
   - Flash the new firmware.
   - Wait for the device to reconnect.
   - Restore your profile and settings.

The entire process takes a few seconds. Your profile and settings are preserved across the update.

### What If Something Goes Wrong

If the device doesn't reconnect after flashing (which shouldn't normally happen), you can manually put it into bootloader mode and reflash. See your device's specific guide for instructions.
