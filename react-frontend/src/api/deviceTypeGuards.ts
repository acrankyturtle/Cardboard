import {
  ActionEvent,
  DeviceKeyLayer,
  KeyboardActionEvent,
  KeyboardKeyDownActionEvent,
  KeyboardKeyUpActionEvent,
  LayerActionEvent,
  LayerClearActionEvent,
  LayerSetActionEvent,
  MouseActionEvent,
  MouseButtonDownActionEvent,
  MouseButtonUpActionEvent,
  MouseMoveActionEvent,
  MouseScrollActionEvent,
  TaggedDeviceLayer,
} from "./deviceTypes.ts";

export const isTaggedDeviceLayer = (
  layer: DeviceKeyLayer | TaggedDeviceLayer,
): layer is TaggedDeviceLayer => "tags" in layer && "matchType" in layer;

export const isKeyboardActionEvent = (
  e: ActionEvent,
): e is { keyboard: KeyboardActionEvent } => "keyboard" in e;

export const isMouseActionEvent = (
  e: ActionEvent,
): e is { mouse: MouseActionEvent } => "mouse" in e;

export const isConsumerControlActionEvent = (
  e: ActionEvent,
): e is { consumerControl: import("./deviceTypes.ts").ConsumerControlEvent } =>
  "consumerControl" in e;

export const isLayerActionEvent = (
  e: ActionEvent,
): e is { layer: LayerActionEvent } => "layer" in e;

export const isDebugActionEvent = (
  e: ActionEvent,
): e is { debug: import("./deviceTypes.ts").DebugActionEvent } => "debug" in e;

export const isKeyDownEvent = (
  e: KeyboardActionEvent,
): e is KeyboardKeyDownActionEvent => "keyDown" in e;

export const isKeyUpEvent = (
  e: KeyboardActionEvent,
): e is KeyboardKeyUpActionEvent => "keyUp" in e;

export const isMouseDownEvent = (
  e: MouseActionEvent,
): e is MouseButtonDownActionEvent => "buttonDown" in e;

export const isMouseUpEvent = (
  e: MouseActionEvent,
): e is MouseButtonUpActionEvent => "buttonUp" in e;

export const isMouseScrollEvent = (
  e: MouseActionEvent,
): e is MouseScrollActionEvent => "scroll" in e;

export const isMouseMoveEvent = (
  e: MouseActionEvent,
): e is MouseMoveActionEvent => "move" in e;

export const isLayerClearEvent = (
  e: LayerActionEvent,
): e is LayerClearActionEvent => "clear" in e;

export const isLayerSetEvent = (
  e: LayerActionEvent,
): e is LayerSetActionEvent => "set" in e;
