import { useMemo } from "react";
import { ListBox } from "../ListBox.tsx";
import {
  useEditDeviceContext,
  getTagsInProfile,
} from "../../lib/editDeviceContext.tsx";
import {
  PanelContainer,
  HeaderBar,
  headerBarIconClass,
  headerBarButtonClass,
} from "./panelShared.tsx";
import { Tooltip } from "../Tooltip.tsx";
import { HelpLink } from "../HelpLink.tsx";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuIcon,
} from "../ContextMenu.tsx";

export function TagsPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();
  const tags = useMemo(() => getTagsInProfile(state.profile), [state.profile]);

  const tagItems = useMemo(() => {
    return tags.map((t) => ({ label: t, value: t }));
  }, [tags]);

  const selectedTags = useMemo(() => {
    return state.selectedTags.map((t) => ({ label: t, value: t }));
  }, [state.selectedTags]);

  const selectAll = () => dispatch({ type: "setSelectedTags", tags });
  const deselectAll = () => dispatch({ type: "setSelectedTags", tags: [] });

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <TagsIcon />
        </div>
        <div>Tags</div>
        <HelpLink className="shrink-0" section="tags" />
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
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
            items={tagItems}
            selected={selectedTags}
            setSelected={(items) =>
              dispatch({
                type: "setSelectedTags",
                tags: items.map((i) => i.value),
              })
            }
            variant={"yellow"}
            isMultiSelect
            renderItem={(item) => {
              return (
                <div className="flex size-full">
                  <div className="grow">{item.label}</div>
                </div>
              );
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
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}

function TagsIcon() {
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
      <path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />
    </svg>
  );
}

export function SelectAllIcon() {
  return (
    <svg
      className="size-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 8m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z" />
      <path d="M12 20v.01" />
      <path d="M16 20v.01" />
      <path d="M8 20v.01" />
      <path d="M4 20v.01" />
      <path d="M4 16v.01" />
      <path d="M4 12v.01" />
      <path d="M4 8v.01" />
      <path d="M4 4v.01" />
      <path d="M8 4v.01" />
      <path d="M12 4v.01" />
      <path d="M16 4v.01" />
      <path d="M20 4v.01" />
      <path d="M20 8v.01" />
      <path d="M20 12v.01" />
      <path d="M20 16v.01" />
      <path d="M20 20v.01" />
    </svg>
  );
}

export function DeselectIcon() {
  return (
    <svg
      className="size-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8h3a1 1 0 0 1 1 1v3" />
      <path d="M16 16h-7a1 1 0 0 1 -1 -1v-7" />
      <path d="M12 20v.01" />
      <path d="M16 20v.01" />
      <path d="M8 20v.01" />
      <path d="M4 20v.01" />
      <path d="M4 16v.01" />
      <path d="M4 12v.01" />
      <path d="M4 8v.01" />
      <path d="M8 4v.01" />
      <path d="M12 4v.01" />
      <path d="M16 4v.01" />
      <path d="M20 4v.01" />
      <path d="M20 8v.01" />
      <path d="M20 12v.01" />
      <path d="M20 16v.01" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
