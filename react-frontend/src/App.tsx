import { NavBar } from "./NavBar.tsx";
import { useWarnOnNavigate } from "./hooks/useWarnOnNavigate.ts";
import { SWRConfig } from "swr";
import { fetcher } from "./api/cardboardApi.ts";
import { Outlet, Route, Routes, useSearchParams } from "react-router";
import { DevicesIndex } from "./pages/DevicesIndex.tsx";
import { LogsIndex } from "./pages/LogsIndex.tsx";
import { AssociationsIndex } from "./pages/AssociationsIndex.tsx";
import { DashboardIndex } from "./pages/DashboardIndex.tsx";

// note: all icons from https://tablericons.com/

function App() {
  // TODO: set to true when editing stuff
  useWarnOnNavigate(false);

  const [searchParams] = useSearchParams();

  return (
    <SWRConfig
      value={{
        fetcher: fetcher,
      }}
    >
      <main className="flex h-full bg-stone-950 text-stone-100">
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
            <Route path="*" element={<NoMatch />} />
          </Route>
        </Routes>
      </main>
    </SWRConfig>
  );
}

function Layout() {
  return (
    <div className="flex size-full overflow-hidden">
      <NavBar className="sticky top-0 left-0" />
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
