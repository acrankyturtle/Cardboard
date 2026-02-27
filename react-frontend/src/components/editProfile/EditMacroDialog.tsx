import clsx from "clsx";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { DeviceMacro, DeviceProfile, MacroType } from "../../api/devices.ts";
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
  getMacroUsages,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { saveMacro } from "../../lib/profileActions.ts";
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
import { ChipListInput } from "../ChipListInput.tsx";
import {
  Select,
  SelectOption,
} from "@root/react-frontend/src/components/SelectBox.tsx";

export function EditMacroDialog() {
  const { state, dispatch } = useEditDeviceContext();
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const showModal =
    state.modal !== null &&
    state.modal.type === "editMacro" &&
    state.modal.show;

  useEffect(() => {
    setIsTemplateEditing(false);
    setTabIndex(0);
  }, [showModal]);

  const selectName =
    state.modal !== null &&
    state.modal.type === "editMacro" &&
    state.modal.selectName === true;

  const nameInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) {
        node.focus();
        if (selectName) {
          node.select();
        }
      }
    },
    [selectName],
  );

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

  const handleConfirm = useCallback(() => {
    if (!showModal || !macro) return;
    const isNewMacro = getMacroUsages(macro.id, state.profile).length === 0 &&
      !state.profile.macros.some((m) => m.id === macro.id);
    dispatch(saveMacro(macro, isNewMacro, state.profile));
    dispatch({ type: "setModal", modal: null });
    dispatch({ type: "setSelectedMacro", macroId: macro.id });
  }, [showModal, macro, dispatch, state.profile]);

  const macroTypeList = useMemo(() => {
    return [
      { id: MacroType.Momentary, name: "Momentary", type: MacroType.Momentary },
      { id: MacroType.Toggle, name: "Toggle", type: MacroType.Toggle },
    ];
  }, []);

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <DialogBody className="gap-y-5">
          <Fieldset className="space-y-4">
            <Field className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input
                ref={nameInputRef}
                className={clsx("w-full", InputClassName)}
                type="text"
                maxLength={255}
                value={macro.name}
                onChange={(e) => setMacro({ ...macro, name: e.target.value })}
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-[1fr_2fr_auto] gap-x-6">
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
                      playChannel:
                        value === "" ? undefined : parseInt(value, 10),
                    });
                  }}
                  placeholder="None"
                />
              </Field>
              <Field className="flex flex-col gap-1">
                <Label>Cut Channels</Label>
                <ChipListInput<number>
                  value={macro.cutChannels}
                  onChange={(channels) =>
                    setMacro({ ...macro, cutChannels: [...channels] })
                  }
                  parseItem={(text) => {
                    const n = parseInt(text, 10);
                    return !isNaN(n)
                      ? Math.min(Math.max(n, 0), 255)
                      : undefined;
                  }}
                  sortItem={(a, b) => a - b}
                  placeholder="Add channel..."
                />
              </Field>
              <Field className="flex flex-col gap-1">
                <Label className="flex items-center gap-2">Type</Label>
                <Select
                  value={macro.type}
                  onChange={(e) => {
                    setMacro({ ...macro, type: e.target.value as MacroType });
                  }}
                >
                  {macroTypeList.map((item) => (
                    <SelectOption
                      key={item.id}
                      value={item.type}
                      selected={macro.type == item.type}
                    >
                      {item.name}
                    </SelectOption>
                  ))}
                </Select>
              </Field>
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
      </form>
      <DialogFooter>
        <div className="grow" />
        <DialogConfirmButton onClick={handleConfirm}>
          Confirm
        </DialogConfirmButton>
        <DialogCancelButton onClick={closeModal}>Cancel</DialogCancelButton>
      </DialogFooter>
    </Dialog>
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
      <Button
        className="text-xs"
        buttonStyle={{ variant: "link" }}
        onClick={() => setShowDialog(true)}
      >
        (view all)
      </Button>
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
