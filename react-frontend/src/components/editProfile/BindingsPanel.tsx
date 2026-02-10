import { isTaggedDeviceLayer } from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  findMacroById,
  findSelectedProfileLayer,
  updateLayerBindings,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { AddIcon, MacroIcon, RemoveIcon } from "../../assets/sharedIcons.tsx";
import { PanelContainer, HeaderBar, headerBarIconClass, headerBarButtonClass } from "./panelShared.tsx";
import { SelectAllIcon, DeselectIcon } from "./TagsPanel.tsx";
import { Tooltip } from "../Tooltip.tsx";

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

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <MacroIcon />
        </div>
        <div className="grow">Bindings</div>
        <Tooltip content="Select all">
          <button
            className={headerBarButtonClass}
            onClick={() => {
              dispatch({
                type: "setSelectedBindings",
                index: macros.map((m) => m.index),
              });
            }}
          >
            <SelectAllIcon />
          </button>
        </Tooltip>
        <Tooltip content="Deselect all">
          <button
            className={headerBarButtonClass}
            onClick={() => {
              dispatch({ type: "setSelectedBindings", index: [] });
            }}
          >
            <DeselectIcon />
          </button>
        </Tooltip>
        <Tooltip content="Add binding">
          <button
            className={headerBarButtonClass}
            onClick={() => {
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
              });

              dispatch({ type: "setSelectedBindings", index: [bindings.length] });
            }}
          >
            <AddIcon />
          </button>
        </Tooltip>
        <Tooltip content="Remove binding">
          <button
            className={headerBarButtonClass}
            onClick={() => {
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
                  bindings.filter(
                    (_, i) => !state.selectedBinding.some((b) => b === i),
                  ),
                ),
              });
              dispatch({
                type: "setSelectedBindings",
                index: [],
              });
            }}
          >
            <RemoveIcon />
          </button>
        </Tooltip>
      </HeaderBar>
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
          });
          dispatch({
            type: "setSelectedBindings",
            index: [],
          });
        }}
      />
    </PanelContainer>
  );
}
