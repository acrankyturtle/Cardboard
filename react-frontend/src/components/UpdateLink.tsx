import clsx from "clsx";

export default function UpdateLink({
  className,
  disabled,
  children,
  ...props
}: { className?: string; disabled?: boolean } & Omit<
  React.ComponentProps<"a">,
  "className"
>) {
  return (
    <a
      className={clsx(
        "text-amber-400 select-none hover:text-amber-300 active:text-amber-300 hover:active:text-amber-200",
        {
          "cursor-pointer": !disabled,
          "pointer-events-none": disabled,
        },
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
