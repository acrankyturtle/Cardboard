import { getButtonClassName } from "./components/Button.tsx";
import clsx from "clsx";
import { forwardRef, ReactElement, ReactNode } from "react";
import { NavLink, To } from "react-router";
import logo from "./assets/key.png";
import { useControllerUpdate } from "./api/controller.ts";
import { Tooltip } from "./components/Tooltip.tsx";

export function NavBar({ className }: { className?: string }) {
  return (
    <nav className={clsx("bg-stone-800", className)}>
      <div className="flex h-full w-16 flex-col items-center">
        <NavLink className="flex min-h-18 flex-col justify-center" to={"/"}>
          <Logo />
        </NavLink>
        <div className="flex h-full flex-col items-center space-y-2 py-3">
          <Tooltip content="Dashboard" side="right">
            <NavBarButton className="flex items-center" to="/">
              {(selected) => <DashboardIcon selected={selected} />}
            </NavBarButton>
          </Tooltip>
          <Tooltip content="Devices" side="right">
            <NavBarButton to="/devices">
              {(selected) => <DeviceIcon selected={selected} />}
            </NavBarButton>
          </Tooltip>
          <Tooltip content="Associations" side="right">
            <NavBarButton to="/associations">
              {(selected) => <AssociationsIcon selected={selected} />}
            </NavBarButton>
          </Tooltip>
          <div className="grow" />
          <Tooltip content="Logs" side="right">
            <NavBarButton to="/logs">
              {(selected) => <LogIcon selected={selected} />}
            </NavBarButton>
          </Tooltip>
          <Tooltip content="Guide" side="right">
            <NavBarButton to="/guide">
              {(selected) => <GuideIcon selected={selected} />}
            </NavBarButton>
          </Tooltip>
        </div>
        <VersionInfo />
      </div>
    </nav>
  );
}

const NavBarButton = forwardRef<
  HTMLAnchorElement,
  {
    className?: string;
    children?: ReactNode | ((selected: boolean) => ReactElement);
    to: To;
  }
>(function NavBarButton({ className, children, to, ...props }, ref) {
  return (
    <NavLink
      ref={ref}
      className={({ isActive }) =>
        clsx(
          "size-11",
          getButtonClassName({
            variant: "navbar",
            focusRing: "dark",
            isActive,
          }),
          className,
        )
      }
      to={to}
      {...props}
    >
      {({ isActive }) =>
        typeof children === "function" ? children(isActive) : children
      }
    </NavLink>
  );
});

function Logo() {
  return (
    <div className="shrink-0">
      <img
        className="size-8 drop-shadow-lg drop-shadow-black/25"
        src={logo}
        alt="Cardboard"
      />
    </div>
  );
}

function VersionInfo() {
  const { updateInfo } = useControllerUpdate();

  return (
    <div className="flex flex-col items-center pb-3 text-center text-xs text-stone-500">
      <span className="font-mono">v{updateInfo?.currentVersion ?? "..."}</span>
      {updateInfo?.updateAvailable && updateInfo.downloadUrl && (
        <Tooltip content={`Update to v${updateInfo.latestVersion}`}>
          <a
            href={updateInfo.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-amber-400 hover:text-amber-300"
          >
            Update
          </a>
        </Tooltip>
      )}
    </div>
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

function AssociationsIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<AssociationsFilled />}
      normalComponent={<AssociationsOutline />}
      selected={selected}
    />
  );
}

function GuideIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<GuideIconFilled />}
      normalComponent={<GuideIconOutline />}
      selected={selected}
    />
  );
}

function LogIcon({ selected }: { selected?: boolean }) {
  return (
    <ToggledIcon
      activeComponent={<LogIconFilled />}
      normalComponent={<LogIconOutline />}
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
  const baseClass =
    "absolute flex size-full items-center justify-center transition duration-250";
  return (
    <div className="relative size-full">
      <div
        className={clsx(baseClass, {
          "opacity-0": selected,
          "opacity-100": !selected,
        })}
      >
        {normalComponent}
      </div>
      <div
        className={clsx(baseClass, {
          "opacity-0": !selected,
          "opacity-100": selected,
        })}
      >
        {activeComponent}
      </div>
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

function AssociationsOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M6 12v-2a6 6 0 1 1 12 0v2" />
      <path d="M15 9l3 3l3 -3" />
    </svg>
  );
}

function AssociationsFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M6 12v-2a6 6 0 1 1 12 0v2" />
      <path d="M15 9l3 3l3 -3" />
    </svg>
  );
}

function LogIconOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h.01" />
      <path d="M4 6h.01" />
      <path d="M4 18h.01" />
      <path d="M8 18h2" />
      <path d="M8 12h2" />
      <path d="M8 6h2" />
      <path d="M14 6h6" />
      <path d="M14 12h6" />
      <path d="M14 18h6" />
    </svg>
  );
}

function LogIconFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h.01" />
      <path d="M4 6h.01" />
      <path d="M4 18h.01" />
      <path d="M8 18h2" />
      <path d="M8 12h2" />
      <path d="M8 6h2" />
      <path d="M14 6h6" />
      <path d="M14 12h6" />
      <path d="M14 18h6" />
    </svg>
  );
}

function GuideIconOutline() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6l0 13" />
      <path d="M12 6l0 13" />
      <path d="M21 6l0 13" />
    </svg>
  );
}

function GuideIconFilled() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6l0 13" />
      <path d="M12 6l0 13" />
      <path d="M21 6l0 13" />
    </svg>
  );
}

