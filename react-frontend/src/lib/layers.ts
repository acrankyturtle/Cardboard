import { ListBoxItem } from "../components/ListBox.tsx";

export interface LayerModelBase {
  layerId: string | 0;
  keyId: string;
  macros: readonly ListBoxItem[];
}

// export type DefaultLayerModel = LayerModelBase & {
//   layerId: 0;
// };
//
// export type TaggedLayerModel = LayerModelBase & {
//   layerId: string;
//   tags: readonly string[];
// };
//
// export type LayerModel = TaggedLayerModel | DefaultLayerModel;

// export const LayerModelFrom = (
//   keyId: string,
//   macros: readonly ListBoxItem[],
//   layer: TaggedDeviceLayer | DeviceKeyLayer,
// ): LayerModel => {
//   const isDefaultLayerGuard = (p: any): p is DeviceKeyLayer => !!p.layerId;
//   const isDefaultLayer = isDefaultLayerGuard(layer);
//
//   return isDefaultLayer
//     ? DefaultLayerModelFrom(keyId, layer, macros)
//     : TaggedLayerModelFrom(keyId, layer, macros);
// };
//
// const DefaultLayerModelFrom = (
//   keyId: string,
//   layer: DeviceKeyLayer,
//   macroList: readonly ListBoxItem[],
// ): DefaultLayerModel => {
//   return {
//     layerId: 0,
//     keyId,
//     macros: layer.macros.map((m) => MapMacroIdToItem(m, macroList)),
//   };
// };
//
// const TaggedLayerModelFrom = (
//   keyId: string,
//   taggedLayer: TaggedDeviceLayer,
//   macroList: readonly ListBoxItem[],
// ): TaggedLayerModel => {
//   return {
//     layerId: taggedLayer.layer.id,
//     keyId: keyId,
//     macros: taggedLayer.layer.macros.map((m) => MapMacroIdToItem(m, macroList)),
//     tags: taggedLayer.tags,
//   };
// };

// const MapMacroIdToItem = (
//   macroId: string,
//   macroList: readonly ListBoxItem[],
// ): ListBoxItem => {
//   return (
//     macroList.find((m) => m.value === macroId) ?? unknownMacroListItem(macroId)
//   );
// };
//
// const unknownMacroListItem = (id: string): ListBoxItem => {
//   return {
//     label: `(not found {${id}})`,
//     value: id,
//   };
// };
