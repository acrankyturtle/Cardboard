import clsx from "clsx";

export function EditDeviceProfile({
  className,
  deviceId,
  goToDevices,
}: {
  className?: string;
  deviceId: string;
  goToDevices: () => void;
}) {
  return (
    <div className={clsx("grid grid-cols-[8fr_5fr]", className)}>
      <div>viewport</div>
      <div className="bg-stone-800">macros</div>
    </div>
  );
}
