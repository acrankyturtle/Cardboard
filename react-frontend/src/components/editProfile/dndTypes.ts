export interface MacroDragData {
  type: "macro";
  macroId: string;
  macroName: string;
}

export type DropTargetData =
  | { type: "key"; keyId: string }
  | { type: "layer"; keyId: string; layerId: string }
  | { type: "bindings" };

export function isMacroDragData(data: unknown): data is MacroDragData {
  return (
    data != null &&
    typeof data === "object" &&
    (data as MacroDragData).type === "macro" &&
    typeof (data as MacroDragData).macroId === "string"
  );
}
