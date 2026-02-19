import clsx from "clsx";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { DeviceMacro, DeviceProfile } from "../../api/devices.ts";
import { Button } from "../Button.tsx";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "../Dialog.tsx";
import {
  findMacroById,
  getMacroUsages,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import {
  Field,
  Fieldset,
  Input,
  Label,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { InputClassName } from "../Input.tsx";
import { SequenceEditor } from "../SequenceEditor.tsx";
import {
  createEndSequenceActionEvent,
  createStartSequenceActionEvent,
} from "../../lib/actionEventUtils.ts";
import { TemplatePanel } from "../MacroTemplates.tsx";
import { HelpLink } from "../HelpLink.tsx";

export function EditMacroDialog() {
  const { state, dispatch } = useEditDeviceContext();
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const showModal =
    state.modal !== null &&
    state.modal.type === "editMacro" &&
    state.modal.show;

  const { macro, setMacro } = useMemo(() => {
    if (!state.modal || state.modal.type !== "editMacro" || !state.modal.show)
      return {};

    const macro = state.modal.macro;
    const setMacro = (m: DeviceMacro) => {
      if (!state.modal || state.modal.type !== "editMacro" || !state.modal.show)
        return;
      dispatch({
        type: "setModal",
        modal: { ...state.modal, macro: m },
      });
    };

    return { macro, setMacro };
  }, [state]);

  const closeModal = useCallback(() => {
    dispatch({ type: "setModal", modal: null });
  }, [dispatch]);

  if (!macro) return <></>;

  const numberOfUsages = getMacroUsages(macro.id, state.profile).length;
  const isNew =
    numberOfUsages === 0 &&
    !state.profile.macros.some((m) => m.id === macro.id);

  return (
    <Dialog
      className="w-5xl"
      open={showModal}
      onClose={closeModal}
      closeOnBackdropClick={false}
    >
      <DialogHeader>
        <DialogHeaderTitle className="flex items-center gap-2">
          Edit Macro
          <HelpLink section="macros" />
        </DialogHeaderTitle>
        <DialogHeaderDescription>
          {isNew ? (
            "New macro"
          ) : numberOfUsages > 1 ? (
            <div className="font-semibold text-sky-300">
              {numberOfUsages} usages
            </div>
          ) : numberOfUsages === 1 ? (
            "1 usage"
          ) : (
            "Unused"
          )}
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="gap-y-5">
        <Fieldset className="space-y-4">
          <Field className="flex flex-col gap-1">
            <Label>Name</Label>
            <Input
              className={clsx("w-full", InputClassName)}
              type="text"
              maxLength={255}
              value={macro.name}
              onChange={(e) => setMacro({ ...macro, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-[1fr_2fr] gap-x-6">
            <Field className="flex flex-col gap-1">
              <Label className="flex items-center gap-2">
                Play Channel
                <ChannelSummaryLink
                  profile={state.profile}
                  currentMacro={macro}
                />
              </Label>
              <Input
                className={clsx("w-full", InputClassName)}
                type="number"
                min={0}
                max={255}
                value={macro.playChannel ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setMacro({
                    ...macro,
                    playChannel: value === "" ? undefined : parseInt(value, 10),
                  });
                }}
                placeholder="None"
              />
            </Field>
            <CutChannelsField
              value={macro.cutChannels}
              onChange={(channels) =>
                setMacro({ ...macro, cutChannels: channels })
              }
            />
          </div>
        </Fieldset>
        <DialogDivider />
        <TabGroup
          className="space-y-4"
          selectedIndex={tabIndex}
          onChange={(index) => {
            // Prevent switching to sequences when template is being edited
            if (isTemplateEditing && index === 0) return;
            setTabIndex(index);
          }}
        >
          <TabList className="space-x-1">
            <Tab
              as={Button}
              className="px-4"
              buttonStyle={{ variant: "navbar" }}
              disabled={isTemplateEditing}
            >
              Sequences
            </Tab>
            <Tab
              as={Button}
              className="px-4"
              buttonStyle={{ variant: "navbar" }}
            >
              Templates
            </Tab>
          </TabList>
          <TabPanels className="h-96 rounded-lg border border-stone-900 bg-stone-800">
            <TabPanel
              tabIndex={-1}
              className="grid size-full grid-cols-3 gap-2 p-2"
            >
              <SequenceEditor
                type="start"
                value={macro?.startSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, startSequence: s });
                }}
                transformActionEvent={(event) =>
                  createStartSequenceActionEvent(
                    event,
                    macro?.endSequence,
                    macro?.startSequence,
                  )
                }
                onCopyToOther={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, endSequence: s });
                }}
              />
              <SequenceEditor
                type="loop"
                value={macro?.loopSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, loopSequence: s });
                }}
              />
              <SequenceEditor
                type="end"
                value={macro?.endSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, endSequence: s });
                }}
                transformActionEvent={(event) =>
                  createEndSequenceActionEvent(
                    event,
                    macro?.startSequence,
                    macro?.endSequence,
                  )
                }
                onCopyToOther={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, startSequence: s });
                }}
              />
            </TabPanel>
            <TabPanel tabIndex={-1} className="size-full p-3">
              <TemplatePanel
                setMacro={(result) => {
                  setMacro({
                    ...macro,
                    startSequence: result.start,
                    loopSequence: result.loop,
                    endSequence: result.end,
                  });
                }}
                onEditingChange={setIsTemplateEditing}
                currentMacro={
                  macro
                    ? {
                        start: macro.startSequence,
                        loop: macro.loopSequence,
                        end: macro.endSequence,
                      }
                    : undefined
                }
                onSwitchToSequences={() => setTabIndex(0)}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </DialogBody>
      <DialogFooter>
        <div className="grow" />
        <DialogConfirmButton
          onClick={() => {
            if (!showModal || !macro) return;
            const exists = findMacroById(macro.id, state.profile) !== null;
            const updated = {
              ...state.profile,
              macros: exists
                ? state.profile.macros.map((m) =>
                    m.id === macro.id ? macro : m,
                  )
                : [...state.profile.macros, macro],
            };
            dispatch({
              type: "setProfile",
              profile: updated,
              description: `${isNew ? "Create" : "Edit"} macro '${macro.name}'`,
            });
            dispatch({
              type: "setModal",
              modal: null,
            });
            dispatch({
              type: "setSelectedMacro",
              macroId: macro.id,
            });
          }}
        >
          Confirm
        </DialogConfirmButton>
        <DialogCancelButton onClick={closeModal}>Cancel</DialogCancelButton>
      </DialogFooter>
    </Dialog>
  );
}

function CutChannelsField({
  value,
  onChange,
}: {
  value: readonly number[];
  onChange: (channels: number[]) => void;
}) {
  const [inputValue, setInputValue] = useState(value.join(", "));

  // Sync input when external value changes (e.g., when switching macros)
  useEffect(() => {
    setInputValue(value.join(", "));
  }, [value]);

  const parseAndUpdate = () => {
    const channels = inputValue
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 255);
    onChange(channels);
    // Also normalize the display
    setInputValue(channels.join(", "));
  };

  return (
    <Field className="flex flex-col gap-1">
      <Label>Cut Channels</Label>
      <Input
        className={clsx("w-full", InputClassName)}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={parseAndUpdate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            parseAndUpdate();
          }
        }}
        placeholder="e.g. 1, 2, 3"
      />
    </Field>
  );
}

function ChannelSummaryLink({
  profile,
  currentMacro,
}: {
  profile: DeviceProfile;
  currentMacro: DeviceMacro;
}) {
  const [showDialog, setShowDialog] = useState(false);

  // Collect all channel usage info, using currentMacro instead of the saved version
  const channelInfo = useMemo(() => {
    const playChannels = new Map<number, string[]>();
    const cutChannels = new Map<number, string[]>();

    // Build macro list: replace existing macro with currentMacro, or add if new
    const macros = profile.macros.some((m) => m.id === currentMacro.id)
      ? profile.macros.map((m) => (m.id === currentMacro.id ? currentMacro : m))
      : [...profile.macros, currentMacro];

    for (const macro of macros) {
      if (macro.playChannel !== undefined) {
        const existing = playChannels.get(macro.playChannel) ?? [];
        playChannels.set(macro.playChannel, [...existing, macro.name]);
      }
      for (const channel of macro.cutChannels) {
        const existing = cutChannels.get(channel) ?? [];
        cutChannels.set(channel, [...existing, macro.name]);
      }
    }

    // Get all unique channels
    const allChannels = new Set([
      ...playChannels.keys(),
      ...cutChannels.keys(),
    ]);
    const sortedChannels = [...allChannels].sort((a, b) => a - b);

    return { playChannels, cutChannels, sortedChannels };
  }, [profile.macros, currentMacro]);

  return (
    <>
      <button
        type="button"
        className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
        onClick={() => setShowDialog(true)}
      >
        (view all)
      </button>
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        className="w-2xl"
      >
        <DialogHeader>
          <DialogHeaderTitle>Channel Summary</DialogHeaderTitle>
          <DialogHeaderDescription>
            Overview of all channels used in this profile
          </DialogHeaderDescription>
        </DialogHeader>
        <DialogDivider />
        <DialogBody className="max-h-80 overflow-y-auto">
          {channelInfo.sortedChannels.length === 0 ? (
            <div className="text-stone-400 italic">
              No channels are currently in use.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {channelInfo.sortedChannels.map((channel) => {
                const playMacros = channelInfo.playChannels.get(channel) ?? [];
                const cutMacros = channelInfo.cutChannels.get(channel) ?? [];
                return (
                  <div
                    key={channel}
                    className="flex flex-col gap-1 rounded-md bg-stone-800 px-2 pt-1 pb-2 shadow shadow-black/25"
                  >
                    <div className="font-semibold text-violet-300">
                      Channel #{channel}
                    </div>
                    {playMacros.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {playMacros.map((name) => (
                          <ChannelSummaryMacro key={name}>
                            {name}
                          </ChannelSummaryMacro>
                        ))}
                      </div>
                    )}
                    {cutMacros.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-sm text-stone-400">Cut by:</span>
                        {cutMacros.map((name) => (
                          <ChannelSummaryMacro key={name}>
                            {name}
                          </ChannelSummaryMacro>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogBody>
        <DialogFooter className="justify-end">
          <DialogCancelButton onClick={() => setShowDialog(false)}>
            Close
          </DialogCancelButton>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function ChannelSummaryMacro({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-blue-900 px-2 py-0.5 text-xs">{children}</span>
  );
}
