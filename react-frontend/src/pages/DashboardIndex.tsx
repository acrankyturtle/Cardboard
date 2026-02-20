import { Link } from "react-router";
import clsx from "clsx";
import { useDeviceList } from "../api/devices.ts";
import { useAssociations } from "../api/associations.ts";
import { SvgIcon } from "../components/SvgIcon.tsx";
import { ReactNode } from "react";
import { getButtonClassName } from "../components/Button.tsx";
import Header from "../components/Header.tsx";

export function DashboardIndex() {
  const { devices, isLoading: devicesLoading } = useDeviceList();
  const { associations, isLoading: associationsLoading } = useAssociations();

  const isLoading = devicesLoading || associationsLoading;

  // Count unique tags across all associations
  const uniqueTags = new Set(associations.flatMap((a) => a.data.tags));

  // Count total virtual key bindings
  const totalBindings = associations.reduce(
    (sum, a) => sum + a.data.virtualKeys.length,
    0,
  );

  return (
    <div className="flex size-full flex-col">
      <Header className="flex items-center">Dashboard</Header>
      <div className="grow overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Devices"
              value={isLoading ? "-" : devices.length}
              icon={<DeviceIcon />}
              color="bg-violet-900/50"
            />
            <StatCard
              label="Associations"
              value={isLoading ? "-" : associations.length}
              icon={<AssociationsIcon />}
              color="bg-sky-900/50"
            />
            <StatCard
              label="Tags"
              value={isLoading ? "-" : uniqueTags.size}
              icon={<TagIcon />}
              color="bg-emerald-900/50"
            />
            <StatCard
              label="Virtual Bindings"
              value={isLoading ? "-" : totalBindings}
              icon={<BindingIcon />}
              color="bg-amber-900/50"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Connected Devices */}
            <DashboardCard title="Connected Devices" linkTo="/devices">
              {devices.length === 0 ? (
                <div className="py-8 text-center text-stone-500">
                  No devices connected
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {devices.map((device) => (
                    <Link
                      key={device.id}
                      to={`/devices?deviceId=${device.id}`}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg p-3",
                        getButtonClassName({
                          variant: "ghost",
                          rounded: "none",
                        }),
                      )}
                    >
                      {device.iconUrl ? (
                        <SvgIcon
                          url={device.iconUrl}
                          className="size-10 rounded"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-stone-700">
                          <DeviceIcon />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{device.name}</span>
                        <span className="text-xs text-stone-400">
                          {device.model}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span className="text-xs text-stone-400">
                          Connected
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </DashboardCard>

            {/* Recent Associations */}
            <DashboardCard title="Associations" linkTo="/associations">
              {associations.length === 0 ? (
                <div className="py-8 text-center text-stone-500">
                  No associations configured
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {associations.slice(0, 5).map((assoc) => (
                    <div
                      key={assoc.id}
                      className="flex items-center gap-3 rounded-lg bg-stone-800/50 p-3"
                    >
                      <div className="flex size-10 items-center justify-center rounded bg-stone-700">
                        <AssociationsIcon />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1">
                          {assoc.data.tags.length > 0 ? (
                            assoc.data.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-stone-700 px-2 py-0.5 text-xs"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-stone-500 italic">
                              No tags
                            </span>
                          )}
                          {assoc.data.tags.length > 3 && (
                            <span className="text-xs text-stone-500">
                              +{assoc.data.tags.length - 3} more
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-400">
                          {assoc.data.virtualKeys.length} binding
                          {assoc.data.virtualKeys.length !== 1 ? "s" : ""}
                          {assoc.data.matchOnPath.length > 0 &&
                            ` | ${assoc.data.matchOnPath.length} path match${assoc.data.matchOnPath.length !== 1 ? "es" : ""}`}
                        </span>
                      </div>
                    </div>
                  ))}
                  {associations.length > 5 && (
                    <div className="pt-2 text-center text-xs text-stone-500">
                      +{associations.length - 5} more associations
                    </div>
                  )}
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Quick Actions */}
          <DashboardCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickActionButton to="/devices" icon={<DeviceIcon />}>
                Manage Devices
              </QuickActionButton>
              <QuickActionButton to="/associations" icon={<AssociationsIcon />}>
                Edit Associations
              </QuickActionButton>
              <QuickActionButton to="/logs" icon={<LogIcon />}>
                View Logs
              </QuickActionButton>
              <QuickActionButton
                to="/devices"
                icon={<KeyboardIcon />}
                disabled={devices.length === 0}
              >
                Configure Keys
              </QuickActionButton>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-xl p-4 shadow-md shadow-black/25",
        color,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{value}</span>
        <div className="text-stone-400">{icon}</div>
      </div>
      <span className="text-sm text-stone-400">{label}</span>
    </div>
  );
}

function DashboardCard({
  title,
  linkTo,
  children,
}: {
  title: string;
  linkTo?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-stone-800/50 shadow-md shadow-black/25">
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        {linkTo && (
          <Link
            to={linkTo}
            className="text-sm text-stone-400 hover:text-stone-200"
          >
            View all
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QuickActionButton({
  to,
  icon,
  children,
  disabled,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-stone-800/50 p-4 text-stone-500">
        <div className="rounded-full bg-stone-700/50 p-3">{icon}</div>
        <span className="text-center text-sm">{children}</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={clsx(
        "flex flex-col items-center gap-2 rounded-lg p-4",
        getButtonClassName({ variant: "ghost", rounded: "none" }),
      )}
    >
      <div className="rounded-full bg-stone-700 p-3">{icon}</div>
      <span className="text-center text-sm">{children}</span>
    </Link>
  );
}

// Icons
function DeviceIcon() {
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
      <path d="M7 8h10v8a5 5 0 0 1 -10 0z" />
      <path d="M9 8v-5h6v5" />
    </svg>
  );
}

function AssociationsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
    >
      <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M6 12v-2a6 6 0 1 1 12 0v2" />
      <path d="M15 9l3 3l3 -3" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
    >
      <path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />
    </svg>
  );
}

function BindingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
    >
      <path d="M9 15l6 -6" />
      <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
      <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
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

function KeyboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
    >
      <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z" />
      <path d="M6 10l0 .01" />
      <path d="M10 10l0 .01" />
      <path d="M14 10l0 .01" />
      <path d="M18 10l0 .01" />
      <path d="M6 14l0 .01" />
      <path d="M18 14l0 .01" />
      <path d="M10 14l4 .01" />
    </svg>
  );
}
