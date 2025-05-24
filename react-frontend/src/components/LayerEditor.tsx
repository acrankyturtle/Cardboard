import { ListBoxItem } from "./ListBox";

interface LayerModel {
  macro: readonly ListBoxItem[];
}

interface TaggedLayerModel {
  tags: readonly string[];
}

export function LayerEditor({
  value,
  onChange,
}: {
  value: LayerModel | TaggedLayerModel;
  onChange: (value: LayerModel | TaggedLayerModel) => void;
}) {
  return <div></div>;
}
