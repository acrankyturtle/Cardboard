import { ReactNode, useCallback, useState } from "react";
import Header from "../components/Header.tsx";
import clsx from "clsx";
import { Button } from "../components/Button.tsx";
import {
  Association,
  AssociationData,
  createAssociation,
  createEmptyAssociationData,
  deleteAssociation,
  getInputKeyLabel,
  updateAssociation,
  useAssociations,
} from "../api/associations.ts";
import {
  DelayedLoadingIndicator,
  LargeLoadingIndicator,
} from "../components/LoadingIndicator.tsx";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
} from "../components/Dialog.tsx";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  ThickExportIcon,
  ThickImportIcon,
} from "../assets/sharedIcons.tsx";
import { Tooltip } from "../components/Tooltip.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { downloadJsonFile, pickAndReadJsonFile } from "../lib/jsonFileUtils.ts";
import { EditAssociationDialog } from "../components/EditAssociationsDialog.tsx";
import { EmblemPreview } from "../components/EmblemPreview.tsx";

export function AssociationsIndex() {
  const { associations, isLoading, error, mutate } = useAssociations();
  const [editingAssociation, setEditingAssociation] = useState<{
    id: string | null;
    data: AssociationData;
  } | null>(null);
  const [deletingAssociation, setDeletingAssociation] =
    useState<Association | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = useCallback(() => {
    downloadJsonFile(
      { associations: associations.map((a) => a.data) },
      "cardboard.associations.json",
    );
  }, [associations]);

  const handleExportOne = useCallback((association: Association) => {
    downloadJsonFile(
      { associations: [association.data] },
      "single.associations.json",
    );
  }, []);

  const handleImport = useCallback(async () => {
    const file = await pickAndReadJsonFile<{
      associations: AssociationData[];
    }>(".associations.json");
    if (!file) return;

    if (
      !file.associations ||
      !Array.isArray(file.associations) ||
      !file.associations.every(
        (a) =>
          Array.isArray(a.tags) &&
          Array.isArray(a.virtualKeys) &&
          Array.isArray(a.matchOnPath),
      )
    ) {
      setImportError(
        "Invalid file: expected { associations: [{ tags, virtualKeys, matchOnPath }] }",
      );
      return;
    }

    setImportError(null);
    setImporting(true);
    let errorCount = 0;

    for (const data of file.associations) {
      const result = await createAssociation(data);
      if ("error" in result) {
        errorCount++;
      }
    }

    setImporting(false);
    mutate();

    if (errorCount > 0) {
      setImportError(
        `Failed to import ${errorCount} of ${file.associations.length} associations`,
      );
    }
  }, [mutate]);

  const handleAdd = () => {
    setSaveError(null);
    setEditingAssociation({
      id: null,
      data: createEmptyAssociationData(),
    });
  };

  const handleEdit = (association: Association) => {
    setSaveError(null);
    setEditingAssociation({
      id: association.id,
      data: { ...association.data },
    });
  };

  const handleSave = async (data: AssociationData) => {
    if (!editingAssociation) return;

    setSaveError(null);
    let result: "success" | { error: string };

    if (editingAssociation.id) {
      result = await updateAssociation(editingAssociation.id, data);
    } else {
      const createResult = await createAssociation(data);
      result = "error" in createResult ? createResult : "success";
    }

    if (result === "success") {
      setEditingAssociation(null);
      mutate();
    } else {
      setSaveError(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingAssociation) return;

    setDeleteError(null);
    const result = await deleteAssociation(deletingAssociation.id);

    if (result === "success") {
      setDeletingAssociation(null);
      mutate();
    } else {
      setDeleteError(result.error);
    }
  };

  return (
    <div className="flex size-full flex-col">
      <AssociationsHeader>
        <div className="grow">Associations</div>
        {importError && (
          <div className="text-lg text-red-500">{importError}</div>
        )}
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleImport}
          disabled={importing}
        >
          <div className="-my-2 -ml-1 size-5">
            <ThickImportIcon />
          </div>
          <div>{importing ? "Importing..." : "Import"}</div>
        </Button>
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleExport}
          disabled={associations.length === 0}
        >
          <div className="-my-2 -ml-1 size-5">
            <ThickExportIcon />
          </div>
          <div>Export</div>
        </Button>
        <Button className="gap-1 px-4" onClick={handleAdd}>
          <div className="-my-2 -ml-2 size-7">
            <AddIcon />
          </div>
          <div>Add</div>
        </Button>
        <HelpLink section="associations" size="medium" />
      </AssociationsHeader>
      <div className="grow overflow-y-auto p-4">
        {isLoading ? (
          <DelayedLoadingIndicator
            delayMs={250}
            renderLoading={() => <LargeLoadingIndicator className="m-2" />}
            renderWait={() => <></>}
          />
        ) : error ? (
          <div className="flex gap-1">
            <div className="text-red-500">Error loading associations:</div>
            <div className="whitespace-pre-wrap text-red-500">
              {error.message}
            </div>
          </div>
        ) : associations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-8 text-stone-400">
            <div>No associations configured</div>
            <Button onClick={handleAdd}>Add Association</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {associations.map((association) => (
              <AssociationCard
                key={association.id}
                association={association}
                onEdit={() => handleEdit(association)}
                onExport={() => handleExportOne(association)}
                onDelete={() => setDeletingAssociation(association)}
              />
            ))}
          </div>
        )}
      </div>

      <EditAssociationDialog
        open={editingAssociation !== null}
        isNew={editingAssociation?.id === null}
        data={editingAssociation?.data ?? createEmptyAssociationData()}
        setData={(data) =>
          setEditingAssociation((prev) => (prev ? { ...prev, data } : null))
        }
        onClose={() => setEditingAssociation(null)}
        onSave={handleSave}
        error={saveError}
      />

      <DeleteConfirmDialog
        open={deletingAssociation !== null}
        association={deletingAssociation}
        onClose={() => setDeletingAssociation(null)}
        onConfirm={handleDelete}
        error={deleteError}
      />
    </div>
  );
}

function AssociationsHeader({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Header
      className={clsx("sticky top-0 flex gap-2 justify-self-start", className)}
    >
      {children}
    </Header>
  );
}

function AssociationCard({
  association,
  onEdit,
  onExport,
  onDelete,
}: {
  association: Association;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-stone-700 bg-stone-800 p-4 shadow">
      {association.data.emblem && (
        <EmblemPreview
          className="place-self-center"
          emblem={association.data.emblem}
          size={32}
        />
      )}
      <AssociationDetails className="grow" association={association} />
      <div className="flex gap-2">
        <Tooltip content="Edit">
          <Button
            buttonStyle={{ variant: "ghost", padding: "none" }}
            onClick={onEdit}
          >
            <div className="size-8 p-1.5">
              <EditIcon />
            </div>
          </Button>
        </Tooltip>
        <Tooltip content="Export">
          <Button
            buttonStyle={{ variant: "ghost", padding: "none" }}
            onClick={onExport}
          >
            <div className="size-8 p-1.5">
              <ThickExportIcon />
            </div>
          </Button>
        </Tooltip>
        <Tooltip content="Delete">
          <Button
            className="text-red-400 hover:text-red-300"
            buttonStyle={{ variant: "ghost", padding: "none" }}
            onClick={onDelete}
          >
            <div className="size-8 p-1.5">
              <DeleteIcon />
            </div>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  association,
  onClose,
  onConfirm,
  error,
}: {
  open: boolean;
  association: Association | null;
  onClose: () => void;
  onConfirm: () => void;
  error: string | null;
}) {
  return (
    <Dialog className="w-96" open={open} onClose={onClose}>
      <DialogHeader>
        <DialogHeaderTitle>Delete Association</DialogHeaderTitle>
      </DialogHeader>
      <DialogDivider />
      <DialogBody>
        <p>Are you sure you want to delete this association?</p>
        {association && (
          <AssociationDetails
            className="overflow-x-auto rounded-lg border border-stone-900 bg-stone-800 p-2"
            association={association}
          />
        )}
        <p className="text-sm text-stone-400">This action cannot be undone.</p>
      </DialogBody>
      <DialogFooter className="justify-end">
        {error && <div className="mr-auto text-red-400">{error}</div>}
        <DialogCancelButton onClick={onClose}>Cancel</DialogCancelButton>
        <Button
          className="min-w-24"
          buttonStyle={{ variant: "danger" }}
          onClick={onConfirm}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function AssociationDetails({
  className,
  association,
}: {
  className?: string;
  association: Association;
}) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <ApplicationPathList association={association} />
      <TagsList association={association} />
      <VirtualKeyList association={association} />
    </div>
  );
}

function ApplicationPathList({ association }: { association: Association }) {
  return association.data.matchOnPath.length > 0 ? (
    <ItemsContainer>
      <ItemListHeader>Match Paths</ItemListHeader>
      <ItemListBody>
        {association.data.matchOnPath.map((path, i) => (
          <Item key={i} className="bg-gray-700 text-sm">
            {path}
          </Item>
        ))}
      </ItemListBody>
    </ItemsContainer>
  ) : (
    <div className="text-sm text-stone-500 italic">(No match paths)</div>
  );
}

function TagsList({ association }: { association: Association }) {
  return (
    association.data.tags.length > 0 && (
      <ItemsContainer>
        <ItemListHeader>Tags</ItemListHeader>
        <ItemListBody>
          {association.data.tags.map((tag) => (
            <Item key={tag} className="bg-yellow-800 text-sm">
              {tag}
            </Item>
          ))}
        </ItemListBody>
      </ItemsContainer>
    )
  );
}

function VirtualKeyList({ association }: { association: Association }) {
  return (
    association.data.virtualKeys.length > 0 && (
      <ItemsContainer>
        <ItemListHeader>Virtual Keys</ItemListHeader>
        <ItemListBody>
          {association.data.virtualKeys.map((vk, i) => {
            const { vid, pid, serial, description } = vk.deviceMatching;
            const hasFilters = vid || pid || serial || description;
            return (
              <Item
                key={i}
                className="flex-col items-start bg-cyan-900 text-xs"
              >
                <div>
                  {getInputKeyLabel(vk.deviceMatching.inputKey)} → VK
                  {vk.virtualKey + 1}
                </div>
                {hasFilters && (
                  <div className="text-cyan-300">
                    {[
                      vid && `VID:${vid}`,
                      pid && `PID:${pid}`,
                      serial && `S/N:${serial}`,
                      description && `DESC:"${description}"`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                )}
              </Item>
            );
          })}
        </ItemListBody>
      </ItemsContainer>
    )
  );
}

function ItemsContainer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>{children}</div>
  );
}

function ItemListHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="text-xs font-medium text-stone-400 uppercase">
      {children}
    </div>
  );
}

function ItemListBody({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("ml-3 flex flex-wrap items-start gap-1", className)}>
      {children}
    </div>
  );
}

function Item({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx("rounded px-2 py-0.5 font-mono text-nowrap", className)}
    >
      {children}
    </div>
  );
}
