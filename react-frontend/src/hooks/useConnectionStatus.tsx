import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { useDeviceEvents } from "../api/devices.ts";

interface ConnectionStatusContext {
  connected: boolean;
}

const ConnectionStatusContext = createContext<ConnectionStatusContext>({
  connected: true,
});

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(true);

  const onConnected = useCallback(() => setConnected(true), []);
  const onDisconnected = useCallback(() => setConnected(false), []);

  useDeviceEvents({ onConnected, onDisconnected });

  return (
    <ConnectionStatusContext value={{ connected }}>
      {children}
    </ConnectionStatusContext>
  );
}

export function useConnectionStatus() {
  return useContext(ConnectionStatusContext);
}
