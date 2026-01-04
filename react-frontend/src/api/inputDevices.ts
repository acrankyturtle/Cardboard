import { getApiUrl } from "./cardboardApi.ts";

export interface InputDeviceInfo {
  vid: string;
  pid: string;
  serial: string;
  description: string;
}

export const getInputDevices = async (
  signal?: AbortSignal,
): Promise<InputDeviceInfo[]> => {
  const response = await fetch(getApiUrl("input-devices"), { signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch input devices: ${response.statusText}`);
  }

  const data: { devices: InputDeviceInfo[] } = await response.json();
  return data.devices;
};
