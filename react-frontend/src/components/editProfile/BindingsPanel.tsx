import { isTaggedDeviceLayer } from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  findMacroById,
  findSelectedProfileLayer,
  updateLayerBindings,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { AddIcon, MacroIcon, RemoveIcon } from "../../assets/sharedIcons.tsx";
import {
  PanelContainer,
  HeaderBar,
  headerBarIconClass,
  headerBarButtonClass,
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
    bindings?.map((m, i) => {
      const macro = findMacroById(m, state.profile);
      return macro
        ? { label: macro.name, value: macro.id, index: i }
        : { label: "(unknown)", value: m, index: i };
    }) ?? [];

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

    if (bindings.some((m) => m === state.selectedMacro)) return;

    dispatch({
      type: "setProfile",
      profile: updateLayerBindings(
        state.selectedKey,
        state.selectedLayer,
        state.profile,
        [...bindings, state.selectedMacro],
      ),
      description: "Add binding",
    });

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
    dispatch({
      type: "setProfile",
      profile: updateLayerBindings(
        state.selectedKey,
        state.selectedLayer,
        state.profile,
        bindings.filter((_, i) => !state.selectedBinding.some((b) => b === i)),
      ),
      description: "Remove binding",
    });
    dispatch({
      type: "setSelectedBindings",
      index: [],
    });
  };

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
          <button className={headerBarButtonClass} onClick={selectAll}>
            <SelectAllIcon />
          </button>
        </Tooltip>
        <Tooltip content="Deselect all">
          <button className={headerBarButtonClass} onClick={deselectAll}>
            <DeselectIcon />
          </button>
        </Tooltip>
        <Tooltip content="Add binding">
          <button className={headerBarButtonClass} onClick={addBinding}>
            <AddIcon />
          </button>
        </Tooltip>
        <Tooltip content="Remove binding">
          <button className={headerBarButtonClass} onClick={removeBinding}>
            <RemoveIcon />
          </button>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
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
            onDelete={(items) => {
              if (
                !state.selectedKey ||
                !state.selectedLayer ||
                state.selectedBinding === null ||
                !bindings
              )
                return;
              dispatch({
                type: "setProfile",
                profile: updateLayerBindings(
                  state.selectedKey,
                  state.selectedLayer,
                  state.profile,
                  bindings.filter((_, i) => !items.some((b) => b.index === i)),
                ),
                description: "Remove binding",
              });
              dispatch({
                type: "setSelectedBindings",
                index: [],
              });
            }}
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
            Add Binding
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
