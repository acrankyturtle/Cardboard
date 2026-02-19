import clsx from "clsx";
import { useMemo } from "react";
import { DeviceMacro } from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  deleteMacro,
  findMacroById,
  getMacroUsages,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import {
  AddIcon,
  ExportIcon,
  ImportIcon,
  MacroIcon,
  PasteIcon,
  RemoveIcon,
} from "../../assets/sharedIcons.tsx";
import { downloadJsonFile, pickAndReadJsonFile } from "../../lib/jsonFileUtils.ts";
import { PanelContainer, HeaderBar, headerBarButtonClass } from "./panelShared.tsx";
import { Tooltip } from "../Tooltip.tsx";
import { HelpLink } from "../HelpLink.tsx";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuIcon,
} from "../ContextMenu.tsx";

export function isValidMacro(data: unknown): data is DeviceMacro {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.name === "string" &&
    Array.isArray(d.cutChannels) &&
    d.startSequence != null &&
    d.loopSequence != null &&
    d.endSequence != null
  );
}

export function MacrosPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const macros: readonly ListBoxItem[] = useMemo(
    () =>
      state.profile.macros.map((m) => {
        return { label: m.name, value: m.id };
      }),
    [state],
  );

  const { selectedMacro, selectedMacroUsages } = useMemo(() => {
    if (!state.selectedMacro) return {};
    const selectedMacro =
      macros.find((l) => l.value === state.selectedMacro) ?? null;
    const selectedMacroUsages = getMacroUsages(
      state.selectedMacro,
      state.profile,
    ).length;
    return { selectedMacro, selectedMacroUsages };
  }, [state]);

  const newMacro = () => {
    dispatch({
      type: "setModal",
      modal: {
        type: "editMacro",
        show: true,
        macro: {
          id: crypto.randomUUID(),
          name: "New Macro",
          cutChannels: [],
          startSequence: { actions: [] },
          loopSequence: { actions: [] },
          endSequence: { actions: [] },
        },
      },
    });
  };

  const copyMacro = () => {
    if (!state.selectedMacro) return;
    const macro = findMacroById(state.selectedMacro, state.profile);
    if (!macro) return;
    const { id: _, ...macroWithoutId } = macro;
    navigator.clipboard.writeText(
      JSON.stringify(macroWithoutId, null, 2),
    );
  };

  const pasteMacro = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      if (!isValidMacro(data)) return;
      dispatch({
        type: "setModal",
        modal: {
          type: "editMacro",
          show: true,
          macro: { ...data, id: crypto.randomUUID() },
        },
      });
    } catch {
      // invalid clipboard content — silently ignore
    }
  };

  const importMacro = async () => {
    const data = await pickAndReadJsonFile<DeviceMacro>();
    if (!data || !isValidMacro(data)) return;
    dispatch({
      type: "setModal",
      modal: {
        type: "editMacro",
        show: true,
        macro: { ...data, id: crypto.randomUUID() },
      },
    });
  };

  const exportMacro = () => {
    if (!state.selectedMacro) return;
    const macro = findMacroById(state.selectedMacro, state.profile);
    if (!macro) return;
    const { id: _, ...macroWithoutId } = macro;
    downloadJsonFile(macroWithoutId, `${macro.name}-macro.json`);
  };

  const deleteMacroAction = () => {
    if (!state.selectedMacro) return;
    const result = deleteMacro(state.selectedMacro, state.profile);
    if (result === "in use") return;

    const index = state.profile.macros.findIndex(
      (m) => m.id === state.selectedMacro,
    );

    const newSelectedMacro =
      index < 0 || state.profile.macros.length === 1
        ? null
        : index + 1 < state.profile.macros.length
          ? state.profile.macros[index + 1].id
          : state.profile.macros[index - 1].id;

    const macroName =
      state.profile.macros.find((m) => m.id === state.selectedMacro)?.name ??
      "macro";
    dispatch({
      type: "setProfile",
      profile: result,
      description: `Delete macro '${macroName}'`,
    });

    if (newSelectedMacro !== null) {
      dispatch({ type: "setSelectedMacro", macroId: newSelectedMacro });
    }
  };

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className="size-5">
          <MacroIcon />
        </div>
        <div>Macros</div>
        <HelpLink section="macros" />
        <div className="grow" />
        <Tooltip content="New macro">
          <button className={headerBarButtonClass} onClick={newMacro}>
            <AddIcon />
          </button>
        </Tooltip>
        <Tooltip content="Copy">
          <button
            className={headerBarButtonClass}
            onClick={copyMacro}
            disabled={state.selectedMacro === null}
          >
            <CopyIcon />
          </button>
        </Tooltip>
        <Tooltip content="Paste">
          <button className={headerBarButtonClass} onClick={pasteMacro}>
            <PasteIcon />
          </button>
        </Tooltip>
        <Tooltip content="Import">
          <button className={headerBarButtonClass} onClick={importMacro}>
            <ImportIcon />
          </button>
        </Tooltip>
        <Tooltip content="Export">
          <button
            className={headerBarButtonClass}
            onClick={exportMacro}
            disabled={state.selectedMacro === null}
          >
            <ExportIcon />
          </button>
        </Tooltip>
        <Tooltip content="Delete macro">
          <button
            className={headerBarButtonClass}
            onClick={deleteMacroAction}
            disabled={selectedMacroUsages !== 0}
          >
            <RemoveIcon />
          </button>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
            variant="blue"
            renderItem={(item) => <MacroListItem item={item} />}
            items={macros}
            selected={selectedMacro}
            setSelected={(v) =>
              dispatch({ type: "setSelectedMacro", macroId: v.value })
            }
            onDoubleClick={(item) => {
              const macro = findMacroById(item.value, state.profile);
              if (!macro) return;
              dispatch({
                type: "setModal",
                modal: {
                  type: "editMacro",
                  show: true,
                  macro,
                },
              });
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuItem onClick={newMacro}>
            <ContextMenuIcon>
              <AddIcon />
            </ContextMenuIcon>
            New Macro
          </ContextMenuItem>
          <ContextMenuItem
            disabled={state.selectedMacro === null}
            onClick={copyMacro}
          >
            <ContextMenuIcon>
              <CopyIcon />
            </ContextMenuIcon>
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={pasteMacro}>
            <ContextMenuIcon>
              <PasteIcon />
            </ContextMenuIcon>
            Paste
          </ContextMenuItem>
          <ContextMenuItem onClick={importMacro}>
            <ContextMenuIcon>
              <ImportIcon />
            </ContextMenuIcon>
            Import
          </ContextMenuItem>
          <ContextMenuItem
            disabled={state.selectedMacro === null}
            onClick={exportMacro}
          >
            <ContextMenuIcon>
              <ExportIcon />
            </ContextMenuIcon>
            Export
          </ContextMenuItem>
          <ContextMenuItem
            disabled={selectedMacroUsages !== 0}
            onClick={deleteMacroAction}
          >
            <ContextMenuIcon>
              <RemoveIcon />
            </ContextMenuIcon>
            Delete Macro
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}

function MacroListItem({ item }: { item: ListBoxItem }) {
  const { state } = useEditDeviceContext();
  const usageCount = useMemo(() => {
    return getMacroUsages(item.value, state.profile).length;
  }, [state]);
  return (
    <div className="flex">
      <div
        className={clsx("grow", {
          "text-stone-400": usageCount < 1,
        })}
      >
        {item.label}
      </div>
      <div className="text-stone-400 italic">
        {usageCount < 1 ? "(no usages)" : null}
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      className="p-0.5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
      <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
    </svg>
  );
}
