
import * as Multi from "./models/Multi"
import * as Input from "./models/Input"
import * as Select from "./models/Select"
import * as File from "./models/File"
import * as MultiFile from "./models/MultiFile"
import * as Media from "./models/Media"
import * as MultiMedia from "./models/MultiMedia"
import * as Formula from "./models/Formula"
import * as ObjectList from "./models/ObjectList"
import { ISettingsModal, buildSettingsModal } from "./base/BaseSetting"
import { IField, IFieldManager, Target, baseDisplayValue } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"
import { ModalType } from "./base/BaseModal"
import { IFieldBase, BaseOptions } from "./base/BaseField"
import { Constructor } from "src/typings/types"
import { FieldType as LegacyFieldType } from "src/types/fieldTypes"
import { TFile } from "obsidian"

//TODO next Media and Multi Media (similar to file)

//#region Types

/*
** Types and utils
*/

export type FieldType =
    | "Input"
    | "Select"
    | "Multi"
    | "File"
    | "MultiFile"
    | "Media"
    | "MultiMedia"
    | "Formula"
    | "ObjectList"

export interface TypesOptionsMap {
    Input: Input.Options
    Select: Select.Options
    Multi: Multi.Options
    File: File.Options
    MultiFile: MultiFile.Options
    Media: Media.Options
    MultiMedia: MultiMedia.Options
    Formula: Formula.Options
    ObjectList: ObjectList.Options
}

export function mapLegacyFieldType(type: FieldType): LegacyFieldType {
    switch (type) {
        case "Input": return LegacyFieldType.Input
        case "Select": return LegacyFieldType.Select
        case "Multi": return LegacyFieldType.Multi
        case "File": return LegacyFieldType.File
        case "MultiFile": return LegacyFieldType.MultiFile
        case "Media": return LegacyFieldType.Media
        case "MultiMedia": return LegacyFieldType.MultiMedia
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function mapFieldType(type: LegacyFieldType): FieldType {
    switch (type) {
        case "Input": return "Input"
        case "Select": return "Select"
        case "Multi": return "Multi"
        case "File": return "File"
        case "MultiFile": return "MultiFile"
        case "Media": return "Media"
        case "MultiMedia": return "MultiMedia"
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
        default: throw Error("not implemented")
    }
}

export const fieldTypes: Array<FieldType> = [
    "Input",
    "Select",
    "Multi",
    "File",
    "MultiFile",
    "Media",
    "MultiMedia",
    "Formula",
    "ObjectList"
]

export const multiTypes = [
    "Multi",
    "MultiFile",
    "MultiMedia"
]

export const objectTypes = [
    "Object",
    "ObjectList"
]
export const frontmatterOnlyTypes = [
    "YAML",
    "Object",
    "ObjectList"
]

export const rootOnlyTypes = [
    "Canvas",
    "CanvasGroup",
    "CanvasGroupLink",
    "Lookup",
    "Formula"
]

//#endregion

//#region Factories

/*
** Factories from type
*/

export function getDefaultOptions<O extends BaseOptions>(type: FieldType): O {
    switch (type) {
        case "Input": return Input.DefaultOptions as unknown as O
        case "Select": return Select.DefaultOptions as unknown as O
        case "Multi": return Multi.DefaultOptions as unknown as O
        case "File": return File.DefaultOptions as unknown as O
        case "MultiFile": return MultiFile.DefaultOptions as unknown as O
        case "Media": return Media.DefaultOptions as unknown as O
        case "MultiMedia": return MultiMedia.DefaultOptions as unknown as O
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldSettings<O extends BaseOptions>(Field: Constructor<IField<O>>,
    type: FieldType,
    plugin: MetadataMenu,
    parentSetting?: FieldSetting,
    parentSettingContainer?: HTMLElement): ISettingsModal<O> {
    const base = buildSettingsModal<O>(Field, plugin, parentSetting, parentSettingContainer)
    switch (type) {
        case "Input": return new (Input.settingsModal(base as unknown as Constructor<ISettingsModal<Input.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Select": return new (Select.settingsModal(base as unknown as Constructor<ISettingsModal<Select.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Multi": return new (Multi.settingsModal(base as unknown as Constructor<ISettingsModal<Multi.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "File": return new (File.settingsModal(base as unknown as Constructor<ISettingsModal<File.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "MultiFile": return new (MultiFile.settingsModal(base as unknown as Constructor<ISettingsModal<MultiFile.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Media": return new (Media.settingsModal(base as unknown as Constructor<ISettingsModal<Media.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "MultiMedia": return new (MultiMedia.settingsModal(base as unknown as Constructor<ISettingsModal<MultiMedia.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldModal<O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): ModalType {
    switch (managedField.type) {
        case "Input": return new (Input.valueModal(managedField as unknown as IFieldManager<Target, Input.Options>, plugin))()
        case "Select": return new (Select.valueModal(managedField as unknown as IFieldManager<Target, Select.Options>, plugin))()
        case "Multi": return new (Multi.valueModal(managedField as unknown as IFieldManager<Target, Multi.Options>, plugin))()
        case "File": return new (File.valueModal(managedField as unknown as IFieldManager<Target, File.Options>, plugin))()
        case "MultiFile": return new (MultiFile.valueModal(managedField as unknown as IFieldManager<Target, MultiFile.Options>, plugin))()
        case "Media": return new (Media.valueModal(managedField as unknown as IFieldManager<Target, Media.Options>, plugin))()
        case "MultiMedia": return new (MultiMedia.valueModal(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, plugin))()
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
        default: throw Error("not implemented")
    }
}

export function getFieldClass(type: FieldType): Constructor<IFieldBase> {
    switch (type) {
        case "Input": return Input.Base
        case "Select": return Select.Base
        case "Multi": return Multi.Base
        case "File": return File.Base
        case "MultiFile": return MultiFile.Base
        case "Media": return Media.Base
        case "MultiMedia": return MultiMedia.Base
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
        default: throw Error("not implemented")
    }
}

export type displayValueFunction = (managedField: IFieldManager<Target, BaseOptions>, container: HTMLDivElement, onClicked?: () => any) => void

export function displayValue(type: FieldType): displayValueFunction {
    switch (type) {
        case "Input": return Input.displayValue
        case "Select": return Select.displayValue
        case "Multi": return Multi.displayValue
        case "File": return File.displayValue
        case "MultiFile": return MultiFile.displayValue
        case "Media": return Media.displayValue
        case "MultiMedia": return MultiMedia.displayValue
        // case "Formula": throw Error("not implemented")
        // case "ObjectList": throw Error("not implemented")
        default: return baseDisplayValue
    }
}

export function createDvField<O extends BaseOptions>(
    managedField: IFieldManager<Target, O> | undefined,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    if (!managedField) return
    managedField.value = p[managedField.name] || ""
    switch (managedField.type) {
        case "Input": return Input.createDvField(managedField as unknown as IFieldManager<Target, Input.Options>, dv, p, fieldContainer, attrs)
        case "Select": return Select.createDvField(managedField as unknown as IFieldManager<Target, Select.Options>, dv, p, fieldContainer, attrs)
        case "Multi": return Multi.createDvField(managedField as unknown as IFieldManager<Target, Multi.Options>, dv, p, fieldContainer, attrs)
        case "File": return File.createDvField(managedField as unknown as IFieldManager<Target, File.Options>, dv, p, fieldContainer, attrs)
        case "MultiFile": return MultiFile.createDvField(managedField as unknown as IFieldManager<Target, MultiFile.Options>, dv, p, fieldContainer, attrs)
        case "Media": return Media.createDvField(managedField as unknown as IFieldManager<Target, Media.Options>, dv, p, fieldContainer, attrs)
        case "MultiMedia": return MultiMedia.createDvField(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, dv, p, fieldContainer, attrs)
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getIcon(type: FieldType): string {
    const c = getFieldClass(type)
    return new c().icon
}

//#endregion

//TODO remplir les create settings container et les fields options