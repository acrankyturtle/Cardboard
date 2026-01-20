import useSWR from "swr";

export interface ControllerVersionResponse {
  version: string;
}

export interface ControllerUpdateResponse {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  downloadUrl: string | null;
}

export const useControllerVersion = () => {
  const { data, isLoading, error } =
    useSWR<ControllerVersionResponse>("controller/version");

  return {
    version: data?.version,
    isLoading,
    error,
  };
};

export const useControllerUpdate = () => {
  const { data, isLoading, error } =
    useSWR<ControllerUpdateResponse>("controller/update");

  return {
    updateInfo: data,
    isLoading,
    error,
  };
};
