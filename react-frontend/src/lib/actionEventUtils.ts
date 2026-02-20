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
 * Extracts values from a sequence's actions that match a filter, using an extractor function.
 */
function getEventsOfType<T>(
  sequence: Sequence,
  filterFn: (action: Action) => boolean,
  extractFn: (action: Action) => T,
): T[] {
  return sequence.actions.filter(filterFn).map(extractFn);
}

const getKeyDowns = (sequence: Sequence): KeyboardKey[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isKeyboardActionEvent(a.actionEvent) &&
      isKeyDownEvent(a.actionEvent.keyboard),
    (a) =>
      (a.actionEvent as { keyboard: { keyDown: KeyboardKey } }).keyboard
        .keyDown,
  );

const getKeyUps = (sequence: Sequence): KeyboardKey[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isKeyboardActionEvent(a.actionEvent) &&
      isKeyUpEvent(a.actionEvent.keyboard),
    (a) =>
      (a.actionEvent as { keyboard: { keyUp: KeyboardKey } }).keyboard.keyUp,
  );

const getButtonDowns = (sequence: Sequence): MouseButton[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isMouseActionEvent(a.actionEvent) &&
      isMouseDownEvent(a.actionEvent.mouse),
    (a) =>
      (a.actionEvent as { mouse: { buttonDown: MouseButton } }).mouse
        .buttonDown,
  );

const getButtonUps = (sequence: Sequence): MouseButton[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isMouseActionEvent(a.actionEvent) && isMouseUpEvent(a.actionEvent.mouse),
    (a) =>
      (a.actionEvent as { mouse: { buttonUp: MouseButton } }).mouse.buttonUp,
  );

const getLayerSets = (sequence: Sequence): string[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isLayerActionEvent(a.actionEvent) && isLayerSetEvent(a.actionEvent.layer),
    (a) => (a.actionEvent as { layer: { set: string } }).layer.set,
  );

const getLayerClears = (sequence: Sequence): string[] =>
  getEventsOfType(
    sequence,
    (a) =>
      isLayerActionEvent(a.actionEvent) &&
      isLayerClearEvent(a.actionEvent.layer),
    (a) => (a.actionEvent as { layer: { clear: string } }).layer.clear,
  );

/**
 * Finds the first item in `primary` that has no unused match in `paired`.
 */
function findUnpaired<T>(primary: T[], paired: T[]): T | undefined {
  const usedIndices = new Set<number>();

  for (const item of primary) {
    const matchIndex = paired.findIndex(
      (p, i) => p === item && !usedIndices.has(i),
    );
    if (matchIndex !== -1) {
      usedIndices.add(matchIndex);
    } else {
      return item;
    }
  }
  return undefined;
}

const findUnpairedKeyDown = (startSeq: Sequence, endSeq: Sequence) =>
  findUnpaired(getKeyDowns(startSeq), getKeyUps(endSeq));

const findUnpairedKeyUp = (endSeq: Sequence, startSeq: Sequence) =>
  findUnpaired(getKeyUps(endSeq), getKeyDowns(startSeq));

const findUnpairedButtonDown = (startSeq: Sequence, endSeq: Sequence) =>
  findUnpaired(getButtonDowns(startSeq), getButtonUps(endSeq));

const findUnpairedButtonUp = (endSeq: Sequence, startSeq: Sequence) =>
  findUnpaired(getButtonUps(endSeq), getButtonDowns(startSeq));

const findUnpairedLayerSet = (startSeq: Sequence, endSeq: Sequence) =>
  findUnpaired(getLayerSets(startSeq), getLayerClears(endSeq));

const findUnpairedLayerClear = (endSeq: Sequence, startSeq: Sequence) =>
  findUnpaired(getLayerClears(endSeq), getLayerSets(startSeq));

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
