import { NavBar } from "./NavBar.tsx";
import { useWarnOnNavigate } from "./hooks/useWarnOnNavigate.ts";
import { SWRConfig } from "swr";
import { DeviceView } from "./components/DeviceView.tsx";
import { TabGroup, TabPanel, TabPanels } from "@headlessui/react";
import { Fragment, ReactNode, useState } from "react";
import clsx from "clsx";
import { fetcher } from "./api/cardboardApi.ts";

function App() {
  // TODO: set to true when editing stuff
  useWarnOnNavigate(false);

  const [selectedIndex, setSelectedIndex] = useState(1);

  const showNavBar = false;

  return (
    // <Context value={context}>
    <SWRConfig
      value={{
        fetcher: fetcher,
      }}
    >
      <main className="flex h-full overflow-hidden bg-stone-950 text-stone-100">
        <TabGroup
          as={Fragment}
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
          manual
          vertical
        >
          {showNavBar && <NavBar className="sticky top-0 left-0" />}
          <TabPanels className="mx-auto flex-1 justify-items-center">
            <TabPanel>Dashboard</TabPanel>
            <TabPanel className="flex size-full flex-col justify-items-center">
              <Header className="sticky top-0 justify-self-start">
                Devices
              </Header>
              <DeviceView className="grow overflow-y-auto" />
            </TabPanel>
            <TabPanel>Settings</TabPanel>
          </TabPanels>
        </TabGroup>
      </main>
    </SWRConfig>
    // </Context>
  );
}

function Header({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "w-full items-center bg-stone-900 px-10 py-5 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Panel({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={clsx("p-4", className)}>{children}</div>;
}

export default App;
