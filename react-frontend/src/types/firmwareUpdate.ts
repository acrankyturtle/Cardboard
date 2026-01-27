export type FirmwareUpdateStage =
  | "idle"
  | "confirming"
  | "preparing"
  | "bootloader"
  | "flashing"
  | "reconnecting"
  | "restoring"
  | "success"
  | "error";

export interface FirmwareUpdateState {
  stage: FirmwareUpdateStage;
  error?: FirmwareUpdateError;
}

export interface FirmwareUpdateError {
  code: string;
  message: string;
}

export const STAGE_LABELS: Record<FirmwareUpdateStage, string> = {
  idle: "Idle",
  confirming: "Confirming",
  preparing: "Preparing",
  bootloader: "Entering Bootloader",
  flashing: "Flashing Firmware",
  reconnecting: "Reconnecting",
  restoring: "Restoring",
  success: "Complete",
  error: "Error",
};

export const UPDATE_STAGES_IN_ORDER: FirmwareUpdateStage[] = [
  "preparing",
  "bootloader",
  "flashing",
  "reconnecting",
  "restoring",
];

// Backend SSE event types (polymorphic)
export type FirmwareUpdateEvent =
  | FirmwareUpdateProgressEvent
  | FirmwareUpdateSuccessEvent
  | FirmwareUpdateErrorEvent;

export interface FirmwareUpdateProgressEvent {
  type: "progress";
  stage: BackendFirmwareStage;
}

export interface FirmwareUpdateSuccessEvent {
  type: "success";
  alreadyUpToDate: boolean;
}

export interface FirmwareUpdateErrorEvent {
  type: "error";
  result: string;
  message: string;
}

// Backend stage names (mapped to frontend stages)
export type BackendFirmwareStage =
  | "Preparing"
  | "EnteringBootloader"
  | "WaitingForBootloader"
  | "WritingFirmware"
  | "WaitingForReconnect"
  | "Restoring";

export const BACKEND_STAGE_MAP: Record<BackendFirmwareStage, FirmwareUpdateStage> = {
  Preparing: "preparing",
  EnteringBootloader: "bootloader",
  WaitingForBootloader: "bootloader",
  WritingFirmware: "flashing",
  WaitingForReconnect: "reconnecting",
  Restoring: "restoring",
};
