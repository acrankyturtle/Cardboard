import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { isTaggedDeviceLayer } from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  findMacroById,
  findSelectedProfileLayer,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import {
  addBinding as addBindingAction,
  removeBindings as removeBindingsAction,
} from "../../lib/profileActions.ts";
import { DropTargetData } from "./dndTypes.ts";
import { AddIcon, MacroIcon, RemoveIcon } from "../../assets/sharedIcons.tsx";
import {
  PanelContainer,
  HeaderBar,
  headerBarIconClass,
  HeaderBarButton,
} from "./panelShared.tsx";
import { SelectAllIcon, DeselectIcon } from "./TagsPanel.tsx";
import { Tooltip } from "../Tooltip.tsx";
import { HelpLink } from "../HelpLink.tsx";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuIcon,
} from "../ContextMenu.tsx";

export function BindingsPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const selectedLayer = findSelectedProfileLayer(state);
  const bindings = selectedLayer
    ? isTaggedDeviceLayer(selectedLayer)
      ? selectedLayer.layer.macros
      : selectedLayer.macros
    : undefined;

  const macros: readonly ({ index: number } & ListBoxItem)[] =
    bindings
      ?.map((m, i) => {
        const macro = findMacroById(m, state.profile);
        return macro
          ? { label: macro.name, value: macro.id, index: i }
          : { label: "(unknown)", value: m, index: i };
      })
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  const selectAll = () => {
    dispatch({
      type: "setSelectedBindings",
      index: macros.map((m) => m.index),
    });
  };

  const deselectAll = () => {
    dispatch({ type: "setSelectedBindings", index: [] });
  };

  const addBinding = () => {
    if (
      !state.selectedKey ||
      !state.selectedLayer ||
      !state.selectedMacro ||
      !bindings
    )
      return;

    const result = addBindingAction(
      state.selectedKey,
      state.selectedLayer,
      state.selectedMacro,
      state.profile,
    );
    if (result === "duplicate") return;

    dispatch(result);

    dispatch({
      type: "setSelectedBindings",
      index: [bindings.length],
    });
  };

  const removeBinding = () => {
    if (
      !state.selectedKey ||
      !state.selectedLayer ||
      state.selectedBinding === null ||
      !bindings
    )
      return;
    dispatch(
      removeBindingsAction(
        state.selectedKey,
        state.selectedLayer,
        state.selectedBinding.map((i) => bindings[i]),
        state.profile,
      ),
    );
    dispatch({
      type: "setSelectedBindings",
      index: [],
    });
  };

  const dropData: DropTargetData = { type: "bindings" };
  const { setNodeRef, isOver } = useDroppable({
    id: "bindings-panel",
    data: dropData,
    disabled: !state.selectedKey || !state.selectedLayer,
  });

  const defaultBindingName = "Add binding";
  const bindingName =
    state.selectedMacro !== null
      ? `Bind ${
          findMacroById(state.selectedMacro, state.profile)?.name ??
          defaultBindingName
        }`
      : defaultBindingName;

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <MacroIcon />
        </div>
        <div>Bindings</div>
        <HelpLink className="shrink-0" section="keys-bindings" />
        <div className="grow" />
        <Tooltip content="Select all">
          <HeaderBarButton onClick={selectAll}>
            <SelectAllIcon />
          </HeaderBarButton>
        </Tooltip>
        <Tooltip content="Deselect all">
          <HeaderBarButton onClick={deselectAll}>
            <DeselectIcon />
          </HeaderBarButton>
        </Tooltip>
        <Tooltip content={bindingName}>
          <HeaderBarButton onClick={addBinding}>
            <AddIcon />
          </HeaderBarButton>
        </Tooltip>
        <Tooltip content="Remove binding">
          <HeaderBarButton onClick={removeBinding}>
            <RemoveIcon />
          </HeaderBarButton>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            ref={setNodeRef}
            className={clsx(
              "grow outline-3 -outline-offset-3 outline-blue-400/0 transition-all duration-150",
              {
                "outline-blue-400/100": isOver,
              },
            )}
            items={macros}
            isMultiSelect
            selected={state.selectedBinding.map((i) => macros[i])}
            setSelected={(v) =>
              dispatch({
                type: "setSelectedBindings",
                index: v.map((item) => item.index),
              })
            }
            onDoubleClick={(item) =>
              dispatch({ type: "setSelectedMacro", macroId: item.value })
            }
          />
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuItem onClick={selectAll}>
            <ContextMenuIcon>
              <SelectAllIcon />
            </ContextMenuIcon>
            Select All
          </ContextMenuItem>
          <ContextMenuItem onClick={deselectAll}>
            <ContextMenuIcon>
              <DeselectIcon />
            </ContextMenuIcon>
            Deselect All
          </ContextMenuItem>
          <ContextMenuItem
            disabled={
              !state.selectedKey ||
              !state.selectedLayer ||
              !state.selectedMacro ||
              !bindings
            }
            onClick={addBinding}
          >
            <ContextMenuIcon>
              <AddIcon />
            </ContextMenuIcon>
            {bindingName}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={
              !state.selectedKey ||
              !state.selectedLayer ||
              !state.selectedBinding ||
              state.selectedBinding.length < 1
            }
            onClick={removeBinding}
          >
            <ContextMenuIcon>
              <RemoveIcon />
            </ContextMenuIcon>
            Remove Binding
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}
