import { getButtonClassName } from "./components/Button.tsx";
import clsx from "clsx";
import { ReactElement, ReactNode } from "react";
import { Tab, TabList } from "@headlessui/react";

export function NavBar({ className }: { className?: string }) {
  return (
    <nav className={clsx("bg-stone-800", className)}>
      <div className="flex h-full w-16 flex-col items-center py-4">
        <div>
          <Logo />
        </div>
        <TabList className="mt-10 flex h-full flex-col items-center space-y-4">
          <NavBarButton>
            {(selected) => <DashboardIcon selected={selected} />}
          </NavBarButton>
          <NavBarButton>
            {(selected) => <DeviceIcon selected={selected} />}
          </NavBarButton>
          <NavBarButton>
            {(selected) => <SettingsIcon selected={selected} />}
          </NavBarButton>
          {/*<div className="grow" />*/}
        </TabList>
      </div>
    </nav>
  );
}
function NavBarButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode | ((selected: boolean) => ReactElement);
}) {
  return (
    <Tab
      className={clsx(
        "size-11",
        getButtonClassName({ variant: "navbar", focusRing: "dark" }),
        className,
      )}
    >
      {({ selected }: any) =>
        typeof children === "function" ? children(selected) : children
      }
    </Tab>
  );
}

function Logo() {
  return (
    <div className="shrink-0">
      <img
        className="size-8"
        src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
        alt="Your Company"
      />
    </div>
  );
}

function DashboardIconOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
      strokeWidth="2"
    >
      <path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"></path>
      <path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"></path>
      <path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"></path>
      <path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"></path>
    </svg>
  );
}

function DashboardIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<DashboardIconFilled />}
      normalComponent={<DashboardIconOutline />}
      selected={selected}
    />
  );
}

function DeviceIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<DeviceIconFilled />}
      normalComponent={<DeviceIconOutline />}
      selected={selected}
    />
  );
}

function SettingsIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<SettingsIconFilled />}
      normalComponent={<SettingsIconOutline />}
      selected={selected}
    />
  );
}

function ToggledIcon({
  normalComponent,
  activeComponent,
  selected,
}: {
  normalComponent: ReactNode;
  activeComponent: ReactNode;
  selected?: boolean;
}) {
  return (
    <div className="size-full">
      <div
        className={clsx("absolute flex size-full transition duration-250", {
          "opacity-0": selected,
          "opacity-100": !selected,
        })}
      >
        {normalComponent}
      </div>
      <div
        className={clsx("absolute flex size-full transition duration-250", {
          "opacity-0": !selected,
          "opacity-100": selected,
        })}
      >
        {activeComponent}
      </div>
    </div>
  );
}

function DashboardIconFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
    >
      <path d="M9 3a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2zm0 12a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2zm10 -4a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2zm0 -8a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2z"></path>
    </svg>
  );
}

function DeviceIconOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
      strokeWidth="2"
    >
      <path d="M7 8h10v8a5 5 0 0 1 -10 0z"></path>
      <path d="M9 8v-5h6v5"></path>
    </svg>
  );
}

function DeviceIconFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
    >
      <path d="M15 2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 1 1v8a6 6 0 1 1 -12 0v-8a1 1 0 0 1 1 -1h1v-4a1 1 0 0 1 1 -1zm-1 2h-4v3h4z"></path>
    </svg>
  );
}

function SettingsIconOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
      strokeWidth="2"
    >
      <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path>
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path>
    </svg>
  );
}

function SettingsIconFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
    >
      <path d="M14.647 4.081a.724 .724 0 0 0 1.08 .448c2.439 -1.485 5.23 1.305 3.745 3.744a.724 .724 0 0 0 .447 1.08c2.775 .673 2.775 4.62 0 5.294a.724 .724 0 0 0 -.448 1.08c1.485 2.439 -1.305 5.23 -3.744 3.745a.724 .724 0 0 0 -1.08 .447c-.673 2.775 -4.62 2.775 -5.294 0a.724 .724 0 0 0 -1.08 -.448c-2.439 1.485 -5.23 -1.305 -3.745 -3.744a.724 .724 0 0 0 -.447 -1.08c-2.775 -.673 -2.775 -4.62 0 -5.294a.724 .724 0 0 0 .448 -1.08c-1.485 -2.439 1.305 -5.23 3.744 -3.745a.722 .722 0 0 0 1.08 -.447c.673 -2.775 4.62 -2.775 5.294 0zm-2.647 4.919a3 3 0 1 0 0 6a3 3 0 0 0 0 -6z"></path>
    </svg>
  );
}
