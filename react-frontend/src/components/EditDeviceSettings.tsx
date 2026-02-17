import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import Header from "./Header.tsx";
import { Button, getButtonClassName } from "./Button.tsx";
import {
  DeviceDetails,
  DeviceSettings,
  getDeviceSettings,
  updateDeviceSettings,
} from "../api/devices.ts";
import { LoadingIndicator } from "./LoadingIndicator.tsx";
import { Dialog, DialogBody, DialogDivider, DialogHeader } from "./Dialog.tsx";
import { Checkbox } from "@headlessui/react";
import { NavigationBlocker } from "./NavigationBlocker.tsx";
import { HelpLink } from "./HelpLink.tsx";

export function EditDeviceSettings({
  device,
  className,
}: {
  device: DeviceDetails;
  className?: string;
}) {
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [originalSettings, setOriginalSettings] =
    useState<DeviceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    setLoading(true);
    setLoadError(null);
    getDeviceSettings(device.id, abortController.signal)
      .then((s) => {
        setSettings(s);
        setOriginalSettings(s);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "Failed to load settings");
        setLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [device.id]);

  const hasChanges = useMemo(
    () =>
      settings !== null &&
      originalSettings !== null &&
      JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  );

  const handleSave = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setSaveError(null);

    const result = await updateDeviceSettings(device.id, settings);
    setSaving(false);

    if (result !== "success") {
      setSaveError(result.error);
    } else {
      setOriginalSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    }
  };

  return (
    <div className={clsx("flex size-full flex-col", className)}>
      <NavigationBlocker
        hasChanges={hasChanges}
        message="You have unsaved settings changes. Are you sure you want to leave?"
      />
      <Header className="sticky top-0 flex gap-2 justify-self-start">
        <div className="flex grow items-end gap-3">
          <div>Settings</div>
          <div className="text-lg font-normal">{device.name}</div>
          <div className="text-lg font-normal text-stone-400">{device.id}</div>
        </div>
        <div
          className={clsx("p-1 text-lg text-green-500 transition", {
            "opacity-0 duration-[2000ms]": !saveSuccess,
            "opacity-100 duration-[0ms]": saveSuccess,
          })}
        >
          Settings saved successfully
        </div>
        {saveError && <div className="text-lg text-red-500">{saveError}</div>}
        <Link
          className={clsx("min-w-18 px-3", getButtonClassName({}))}
          to="/devices"
        >
          Cancel
        </Link>
        <Button
          className="min-w-24 px-3"
          buttonStyle={{ variant: "submit" }}
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          Save
        </Button>
        <HelpLink section="device-settings" size="medium" />
      </Header>

      <div className="grow overflow-y-auto p-6">
        {loading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingIndicator className="size-12 text-stone-400" />
          </div>
        ) : loadError ? (
          <div className="text-red-400">Error: {loadError}</div>
        ) : settings ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <SettingsSection title="Mouse">
              <SettingsRow
                label="Enable Mouse"
                description="Disable all mouse functionality. This can be useful when dealing with anti-cheat systems that disable additional mouse devices, such as Vanguard."
              >
                <ToggleSwitch
                  checked={settings.mouseEnabled}
                  onChange={(checked) =>
                    setSettings({ ...settings, mouseEnabled: checked })
                  }
                />
              </SettingsRow>
            </SettingsSection>
          </div>
        ) : null}
      </div>

      <Dialog open={saving}>
        <DialogHeader>Saving...</DialogHeader>
        <DialogDivider />
        <DialogBody className="items-center">
          <div className="mb-2">
            Your settings are currently being transferred to the device.
          </div>
          <div className="mb-6">Please wait...</div>
          <LoadingIndicator className="mb-10 size-24" />
        </DialogBody>
      </Dialog>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-stone-800 p-4">
      <h2 className="mb-4 text-lg font-semibold text-stone-200">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="font-medium text-stone-200">{label}</div>
        {description && (
          <div className="mt-1 text-sm text-stone-400">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      className={clsx(
        "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-stone-900 focus:outline-none",
        checked ? "bg-violet-600" : "bg-stone-600",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </Checkbox>
  );
}
