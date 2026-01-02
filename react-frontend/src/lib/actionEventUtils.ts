import {
  Action,
  ActionEvent,
  isKeyboardActionEvent,
  isMouseActionEvent,
  isLayerActionEvent,
  isKeyDownEvent,
  isKeyUpEvent,
  isMouseDownEvent,
  isMouseUpEvent,
  isLayerSetEvent,
  isLayerClearEvent,
  KeyboardKey,
  MouseButton,
  Sequence,
} from "../api/devices.ts";

/**
 * Checks if an action event is a "down" type (keyDown, buttonDown, or set layer)
 */
export function isDownEvent(event: ActionEvent): boolean {
  if (isKeyboardActionEvent(event)) {
    return isKeyDownEvent(event.keyboard);
  }
  if (isMouseActionEvent(event)) {
    return isMouseDownEvent(event.mouse);
  }
  if (isLayerActionEvent(event)) {
    return isLayerSetEvent(event.layer);
  }
  return false;
}

/**
 * Checks if an action event is an "up" type (keyUp, buttonUp, or clear layer)
 */
export function isUpEvent(event: ActionEvent): boolean {
  if (isKeyboardActionEvent(event)) {
    return isKeyUpEvent(event.keyboard);
  }
  if (isMouseActionEvent(event)) {
    return isMouseUpEvent(event.mouse);
  }
  if (isLayerActionEvent(event)) {
    return isLayerClearEvent(event.layer);
  }
  return false;
}

/**
 * Converts a down event to its corresponding up event
 */
export function convertDownToUp(event: ActionEvent): ActionEvent | null {
  if (isKeyboardActionEvent(event) && isKeyDownEvent(event.keyboard)) {
    return { keyboard: { keyUp: event.keyboard.keyDown } };
  }
  if (isMouseActionEvent(event) && isMouseDownEvent(event.mouse)) {
    return { mouse: { buttonUp: event.mouse.buttonDown } };
  }
  if (isLayerActionEvent(event) && isLayerSetEvent(event.layer)) {
    return { layer: { clear: event.layer.set } };
  }
  return null;
}

/**
 * Converts an up event to its corresponding down event
 */
export function convertUpToDown(event: ActionEvent): ActionEvent | null {
  if (isKeyboardActionEvent(event) && isKeyUpEvent(event.keyboard)) {
    return { keyboard: { keyDown: event.keyboard.keyUp } };
  }
  if (isMouseActionEvent(event) && isMouseUpEvent(event.mouse)) {
    return { mouse: { buttonDown: event.mouse.buttonUp } };
  }
  if (isLayerActionEvent(event) && isLayerClearEvent(event.layer)) {
    return { layer: { set: event.layer.clear } };
  }
  return null;
}

/**
 * Converts an action's event from down to up (preserving predelay)
 */
export function convertActionDownToUp(action: Action): Action | null {
  const upEvent = convertDownToUp(action.actionEvent);
  if (!upEvent) return null;
  return { predelayMs: action.predelayMs, actionEvent: upEvent };
}

/**
 * Converts an action's event from up to down (preserving predelay)
 */
export function convertActionUpToDown(action: Action): Action | null {
  const downEvent = convertUpToDown(action.actionEvent);
  if (!downEvent) return null;
  return { predelayMs: action.predelayMs, actionEvent: downEvent };
}

/**
 * Checks if a start sequence can be converted to an end sequence
 */
export function canConvertToEndSequence(startSequence: Sequence): boolean {
  return (
    startSequence.actions.length > 0 &&
    !startSequence.actions.some((a) => !isDownEvent(a.actionEvent))
  );
}

/**
 * Checks if an end sequence can be converted to a start sequence
 */
export function canConvertToStartSequence(endSequence: Sequence): boolean {
  return (
    endSequence.actions.length > 0 &&
    !endSequence.actions.some((a) => !isUpEvent(a.actionEvent))
  );
}

/**
 * Converts all down events in a sequence to up events (for copying start to end)
 */
export function convertSequenceDownToUp(sequence: Sequence): Sequence {
  const convertedActions = sequence.actions
    .map(convertActionDownToUp)
    .filter((a): a is Action => a !== null);
  return { actions: convertedActions };
}

/**
 * Converts all up events in a sequence to down events (for copying end to start)
 */
export function convertSequenceUpToDown(sequence: Sequence): Sequence {
  const convertedActions = sequence.actions
    .map(convertActionUpToDown)
    .filter((a): a is Action => a !== null);
  return { actions: convertedActions };
}

/**
 * Gets all keyboard keys that are down in the start sequence
 */
function getKeyDowns(sequence: Sequence): KeyboardKey[] {
  return sequence.actions
    .filter(
      (a) =>
        isKeyboardActionEvent(a.actionEvent) &&
        isKeyDownEvent(a.actionEvent.keyboard),
    )
    .map((a) => (a.actionEvent as { keyboard: { keyDown: KeyboardKey } }).keyboard.keyDown);
}

/**
 * Gets all keyboard keys that are up in the end sequence
 */
function getKeyUps(sequence: Sequence): KeyboardKey[] {
  return sequence.actions
    .filter(
      (a) =>
        isKeyboardActionEvent(a.actionEvent) &&
        isKeyUpEvent(a.actionEvent.keyboard),
    )
    .map((a) => (a.actionEvent as { keyboard: { keyUp: KeyboardKey } }).keyboard.keyUp);
}

/**
 * Gets all mouse buttons that are down in the start sequence
 */
function getButtonDowns(sequence: Sequence): MouseButton[] {
  return sequence.actions
    .filter(
      (a) =>
        isMouseActionEvent(a.actionEvent) &&
        isMouseDownEvent(a.actionEvent.mouse),
    )
    .map((a) => (a.actionEvent as { mouse: { buttonDown: MouseButton } }).mouse.buttonDown);
}

/**
 * Gets all mouse buttons that are up in the end sequence
 */
function getButtonUps(sequence: Sequence): MouseButton[] {
  return sequence.actions
    .filter(
      (a) =>
        isMouseActionEvent(a.actionEvent) &&
        isMouseUpEvent(a.actionEvent.mouse),
    )
    .map((a) => (a.actionEvent as { mouse: { buttonUp: MouseButton } }).mouse.buttonUp);
}

/**
 * Gets all layers that are set in the start sequence
 */
function getLayerSets(sequence: Sequence): string[] {
  return sequence.actions
    .filter(
      (a) =>
        isLayerActionEvent(a.actionEvent) &&
        isLayerSetEvent(a.actionEvent.layer),
    )
    .map((a) => (a.actionEvent as { layer: { set: string } }).layer.set);
}

/**
 * Gets all layers that are cleared in the end sequence
 */
function getLayerClears(sequence: Sequence): string[] {
  return sequence.actions
    .filter(
      (a) =>
        isLayerActionEvent(a.actionEvent) &&
        isLayerClearEvent(a.actionEvent.layer),
    )
    .map((a) => (a.actionEvent as { layer: { clear: string } }).layer.clear);
}

/**
 * Finds the first unpaired keyboard key from start sequence for a keyUp event.
 * A key is "paired" if there's already a matching keyUp in the end sequence.
 */
function findUnpairedKeyDown(
  startSequence: Sequence,
  endSequence: Sequence,
): KeyboardKey | undefined {
  const downs = getKeyDowns(startSequence);
  const ups = getKeyUps(endSequence);

  // Track which ups have been used to pair with downs
  const usedUps = new Set<number>();

  for (const down of downs) {
    // Find if there's an unused up that matches this down
    const upIndex = ups.findIndex((up, i) => up === down && !usedUps.has(i));
    if (upIndex !== -1) {
      usedUps.add(upIndex);
    } else {
      // This down has no matching up - it's unpaired
      return down;
    }
  }
  return undefined;
}

/**
 * Finds the first unpaired keyboard key from end sequence for a keyDown event.
 * A key is "paired" if there's already a matching keyDown in the start sequence.
 */
function findUnpairedKeyUp(
  endSequence: Sequence,
  startSequence: Sequence,
): KeyboardKey | undefined {
  const ups = getKeyUps(endSequence);
  const downs = getKeyDowns(startSequence);

  // Track which downs have been used to pair with ups
  const usedDowns = new Set<number>();

  for (const up of ups) {
    // Find if there's an unused down that matches this up
    const downIndex = downs.findIndex((down, i) => down === up && !usedDowns.has(i));
    if (downIndex !== -1) {
      usedDowns.add(downIndex);
    } else {
      // This up has no matching down - it's unpaired
      return up;
    }
  }
  return undefined;
}

/**
 * Finds the first unpaired mouse button from start sequence for a buttonUp event.
 */
function findUnpairedButtonDown(
  startSequence: Sequence,
  endSequence: Sequence,
): MouseButton | undefined {
  const downs = getButtonDowns(startSequence);
  const ups = getButtonUps(endSequence);

  const usedUps = new Set<number>();

  for (const down of downs) {
    const upIndex = ups.findIndex((up, i) => up === down && !usedUps.has(i));
    if (upIndex !== -1) {
      usedUps.add(upIndex);
    } else {
      return down;
    }
  }
  return undefined;
}

/**
 * Finds the first unpaired mouse button from end sequence for a buttonDown event.
 */
function findUnpairedButtonUp(
  endSequence: Sequence,
  startSequence: Sequence,
): MouseButton | undefined {
  const ups = getButtonUps(endSequence);
  const downs = getButtonDowns(startSequence);

  const usedDowns = new Set<number>();

  for (const up of ups) {
    const downIndex = downs.findIndex((down, i) => down === up && !usedDowns.has(i));
    if (downIndex !== -1) {
      usedDowns.add(downIndex);
    } else {
      return up;
    }
  }
  return undefined;
}

/**
 * Finds the first unpaired layer from start sequence for a clear layer event.
 */
function findUnpairedLayerSet(
  startSequence: Sequence,
  endSequence: Sequence,
): string | undefined {
  const sets = getLayerSets(startSequence);
  const clears = getLayerClears(endSequence);

  const usedClears = new Set<number>();

  for (const set of sets) {
    const clearIndex = clears.findIndex((clear, i) => clear === set && !usedClears.has(i));
    if (clearIndex !== -1) {
      usedClears.add(clearIndex);
    } else {
      return set;
    }
  }
  return undefined;
}

/**
 * Finds the first unpaired layer from end sequence for a set layer event.
 */
function findUnpairedLayerClear(
  endSequence: Sequence,
  startSequence: Sequence,
): string | undefined {
  const clears = getLayerClears(endSequence);
  const sets = getLayerSets(startSequence);

  const usedSets = new Set<number>();

  for (const clear of clears) {
    const setIndex = sets.findIndex((set, i) => set === clear && !usedSets.has(i));
    if (setIndex !== -1) {
      usedSets.add(setIndex);
    } else {
      return clear;
    }
  }
  return undefined;
}

/**
 * Creates a default action event for a start sequence, matching unpaired up events from end sequence.
 * @param baseEvent The base event being inserted
 * @param endSequence The end sequence to find matching up events from
 * @param currentStartSequence The current start sequence to check what's already paired
 */
export function createStartSequenceActionEvent(
  baseEvent: ActionEvent,
  endSequence?: Sequence,
  currentStartSequence?: Sequence,
): ActionEvent {
  if (!endSequence) return baseEvent;
  const startSeq = currentStartSequence ?? { actions: [] };

  if (isKeyboardActionEvent(baseEvent) && isKeyDownEvent(baseEvent.keyboard)) {
    const matchingKey = findUnpairedKeyUp(endSequence, startSeq);
    if (matchingKey) {
      return { keyboard: { keyDown: matchingKey } };
    }
  }

  if (isMouseActionEvent(baseEvent) && isMouseDownEvent(baseEvent.mouse)) {
    const matchingButton = findUnpairedButtonUp(endSequence, startSeq);
    if (matchingButton) {
      return { mouse: { buttonDown: matchingButton } };
    }
  }

  if (isLayerActionEvent(baseEvent) && isLayerSetEvent(baseEvent.layer)) {
    const matchingLayer = findUnpairedLayerClear(endSequence, startSeq);
    if (matchingLayer) {
      return { layer: { set: matchingLayer } };
    }
  }

  return baseEvent;
}

/**
 * Creates a default action event for an end sequence, matching unpaired down events from start sequence.
 * @param baseEvent The base event being inserted
 * @param startSequence The start sequence to find matching down events from
 * @param currentEndSequence The current end sequence to check what's already paired
 */
export function createEndSequenceActionEvent(
  baseEvent: ActionEvent,
  startSequence?: Sequence,
  currentEndSequence?: Sequence,
): ActionEvent {
  if (!startSequence) return baseEvent;
  const endSeq = currentEndSequence ?? { actions: [] };

  if (isKeyboardActionEvent(baseEvent) && isKeyUpEvent(baseEvent.keyboard)) {
    const matchingKey = findUnpairedKeyDown(startSequence, endSeq);
    if (matchingKey) {
      return { keyboard: { keyUp: matchingKey } };
    }
  }

  if (isMouseActionEvent(baseEvent) && isMouseUpEvent(baseEvent.mouse)) {
    const matchingButton = findUnpairedButtonDown(startSequence, endSeq);
    if (matchingButton) {
      return { mouse: { buttonUp: matchingButton } };
    }
  }

  if (isLayerActionEvent(baseEvent) && isLayerClearEvent(baseEvent.layer)) {
    const matchingLayer = findUnpairedLayerSet(startSequence, endSeq);
    if (matchingLayer) {
      return { layer: { clear: matchingLayer } };
    }
  }

  return baseEvent;
}
