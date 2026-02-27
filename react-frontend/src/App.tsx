import { NavBar } from "./components/NavBar.tsx";
import { SWRConfig } from "swr";
import { fetcher } from "./api/cardboardApi.ts";
import { Outlet, Route, Routes, useSearchParams } from "react-router";
import { DevicesIndex } from "./pages/DevicesIndex.tsx";
import { LogsIndex } from "./pages/LogsIndex.tsx";
import { AssociationsIndex } from "./pages/AssociationsIndex.tsx";
import { DashboardIndex } from "./pages/DashboardIndex.tsx";
import { GuideIndex, GuideCK130 } from "./pages/GuideIndex.tsx";
import { ConnectionStatusProvider } from "./hooks/useConnectionStatus.tsx";
import { ConnectionLostOverlay } from "./components/ConnectionLostOverlay.tsx";

// note: all icons from https://tablericons.com/

function App() {
  const [searchParams] = useSearchParams();

  return (
    <SWRConfig
      value={{
        fetcher: fetcher,
      }}
    >
      <ConnectionStatusProvider>
        <ConnectionLostOverlay />
        <main className="flex h-full min-w-[64rem] bg-stone-950 text-stone-100">
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardIndex />} />
              <Route
                path="/devices"
                element={
                  <DevicesIndex
                    deviceId={searchParams.get("deviceId")}
                    action={searchParams.get("action")}
                  />
                }
              />
              <Route path="/associations" element={<AssociationsIndex />} />
              <Route path="/logs" element={<LogsIndex />} />
              <Route path="/guide" element={<GuideIndex />} />
              <Route path="/guide/ck1-30" element={<GuideCK130 />} />
              <Route path="*" element={<NoMatch />} />
            </Route>
          </Routes>
        </main>
      </ConnectionStatusProvider>
    </SWRConfig>
  );
}

function Layout() {
  const [searchParams] = useSearchParams();
  const hideNav = searchParams.get("ref") === "help";

  return (
    <div className="flex size-full overflow-hidden">
      {!hideNav && <NavBar className="sticky top-0 left-0" />}
      <div className="mx-auto flex-1 justify-items-center">
        <Outlet />
      </div>
    </div>
  );
}

function NoMatch() {
  return <div>Page not found</div>;
}

export default App;
