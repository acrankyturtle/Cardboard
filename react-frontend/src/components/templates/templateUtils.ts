import {
  ActionEvent,
  ConsumerControlEvent,
  KeyboardKey,
  MouseButton,
  Sequence,
} from "../../api/devices.ts";

export type TemplateType = "basic" | "rapidFire";

export interface TemplateResult {
  start: Sequence;
  loop: Sequence;
  end: Sequence;
}

export type TemplateAction =
  | { type: "keyboard"; key: KeyboardKey }
  | { type: "mouseButton"; button: MouseButton }
  | { type: "mouseScroll"; x: number; y: number }
  | { type: "mouseMove"; x: number; y: number }
  | { type: "consumerControl"; control: ConsumerControlEvent }
  | { type: "layer"; tag: string };

export function templateActionToEvents(action: TemplateAction): {
  down: ActionEvent | null;
  up: ActionEvent | null;
  isInstant: boolean;
} {
  switch (action.type) {
    case "keyboard":
      return {
        down: { keyboard: { keyDown: action.key } },
        up: { keyboard: { keyUp: action.key } },
        isInstant: false,
      };
    case "mouseButton":
      return {
        down: { mouse: { buttonDown: action.button } },
        up: { mouse: { buttonUp: action.button } },
        isInstant: false,
      };
    case "mouseScroll":
      return {
        down: { mouse: { scroll: { x: action.x, y: action.y } } },
        up: null,
        isInstant: true,
      };
    case "mouseMove":
      return {
        down: { mouse: { move: { x: action.x, y: action.y } } },
        up: null,
        isInstant: true,
      };
    case "consumerControl":
      return {
        down: { consumerControl: action.control },
        up: null,
        isInstant: true,
      };
    case "layer":
      return {
        down: { layer: { set: action.tag } },
        up: { layer: { clear: action.tag } },
        isInstant: false,
      };
  }
}

export function eventsEqual(a: ActionEvent, b: ActionEvent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function tryParseDownEvent(event: ActionEvent): TemplateAction | null {
  if ("keyboard" in event && "keyDown" in event.keyboard) {
    return { type: "keyboard", key: event.keyboard.keyDown };
  }
  if ("mouse" in event) {
    if ("buttonDown" in event.mouse) {
      return { type: "mouseButton", button: event.mouse.buttonDown };
    }
    if ("scroll" in event.mouse) {
      return {
        type: "mouseScroll",
        x: event.mouse.scroll.x,
        y: event.mouse.scroll.y,
      };
    }
    if ("move" in event.mouse) {
      return {
        type: "mouseMove",
        x: event.mouse.move.x,
        y: event.mouse.move.y,
      };
    }
  }
  if ("consumerControl" in event) {
    return { type: "consumerControl", control: event.consumerControl };
  }
  if ("layer" in event && "set" in event.layer) {
    return { type: "layer", tag: event.layer.set };
  }
  return null;
}
