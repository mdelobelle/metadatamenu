
import * as Multi from "./models/Multi"
import * as Input from "./models/Input"
import * as Select from "./models/Select"
import * as Cycle from "./models/Cycle"
import * as Boolean from "./models/Boolean"
import * as Date from "./models/Date"
import * as DateTime from "./models/DateTime"
import * as Time from "./models/Time"
import * as File from "./models/File"
import * as MultiFile from "./models/MultiFile"
import * as Media from "./models/Media"
import * as MultiMedia from "./models/MultiMedia"
import * as Canvas from "./models/Canvas"
import * as CanvasGroup from "./models/CanvasGroup"
import * as CanvasGroupLink from "./models/CanvasGroupLink"
import * as Formula from "./models/Formula"
import * as ObjectList from "./models/ObjectList"
import { ISettingsModal, buildSettingsModal } from "./base/BaseSetting"
import { IField, IFieldManager, Target, LegacyField } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"
import { IBaseValueModal } from "./base/BaseModal"
import { IFieldBase, BaseOptions } from "./base/BaseField"
import { Constructor } from "src/typings/types"
import { FieldType as LegacyFieldType } from "src/types/fieldTypes"
import { Menu, TFile } from "obsidian"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import { FieldActions } from "src/components/FieldsModal"


//TODO next Media and Multi Media (similar to file)

//#region Types

/*
** Types and utils
*/

export type FieldType =
    | "Input"
    | "Select"
    | "Cycle"
    | "Boolean"
    | "Date"
    | "DateTime"
    | "Time"
    | "Multi"
    | "File"
    | "MultiFile"
    | "Media"
    | "MultiMedia"
    | "Canvas"
    | "CanvasGroup"
    | "CanvasGroupLink"
    | "Formula"
    | "ObjectList"

export interface TypesOptionsMap {
    Input: Input.Options
    Select: Select.Options
    Cycle: Cycle.Options
    Boolean: Boolean.Options
    Date: Date.Options
    DateTime: DateTime.Options
    Time: Time.Options
    Multi: Multi.Options
    File: File.Options
    MultiFile: MultiFile.Options
    Media: Media.Options
    MultiMedia: MultiMedia.Options
    Canvas: Canvas.Options
    CanvasGroup: CanvasGroup.Options
    CanvasGroupLink: CanvasGroupLink.Options
    Formula: Formula.Options
    ObjectList: ObjectList.Options
}

export function mapLegacyFieldType(type: FieldType): LegacyFieldType {
    switch (type) {
        case "Input": return LegacyFieldType.Input
        case "Select": return LegacyFieldType.Select
        case "Cycle": return LegacyFieldType.Cycle
        case "Boolean": return LegacyFieldType.Boolean
        case "Date": return LegacyFieldType.Date
        case "DateTime": return LegacyFieldType.DateTime
        case "Time": return LegacyFieldType.Time
        case "Multi": return LegacyFieldType.Multi
        case "File": return LegacyFieldType.File
        case "MultiFile": return LegacyFieldType.MultiFile
        case "Media": return LegacyFieldType.Media
        case "MultiMedia": return LegacyFieldType.MultiMedia
        case "Canvas": return LegacyFieldType.Canvas
        case "CanvasGroup": return LegacyFieldType.CanvasGroup
        case "CanvasGroupLink": return LegacyFieldType.CanvasGroupLink
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function mapFieldType(type: LegacyFieldType): FieldType {
    switch (type) {
        case "Input": return "Input"
        case "Select": return "Select"
        case "Cycle": return "Cycle"
        case "Boolean": return "Boolean"
        case "Date": return "Date"
        case "DateTime": return "DateTime"
        case "Time": return "Time"
        case "Multi": return "Multi"
        case "File": return "File"
        case "MultiFile": return "MultiFile"
        case "Media": return "Media"
        case "MultiMedia": return "MultiMedia"
        case "Canvas": return "Canvas"
        case "CanvasGroup": return "CanvasGroup"
        case "CanvasGroupLink": return "CanvasGroupLink"
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
        default: throw Error("not implemented")
    }
}

export const fieldTypes: Array<FieldType> = [
    "Input",
    "Select",
    "Cycle",
    "Boolean",
    "Date",
    "DateTime",
    "Time",
    "Multi",
    "File",
    "MultiFile",
    "Media",
    "MultiMedia",
    "Canvas",
    "CanvasGroup",
    "CanvasGroupLink",
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

export type DateBasedType = "Date" | "DateTime"

//#endregion

//#region Factories

/*
** Factories from type
*/

export function getDefaultOptions<O extends BaseOptions>(type: FieldType): O {
    switch (type) {
        case "Input": return Input.DefaultOptions as unknown as O
        case "Select": return Select.DefaultOptions as unknown as O
        case "Cycle": return Cycle.DefaultOptions as unknown as O
        case "Boolean": return Boolean.DefaultOptions as unknown as O
        case "Date": return Date.DefaultOptions as unknown as O
        case "DateTime": return DateTime.DefaultOptions as unknown as O
        case "Time": return Time.DefaultOptions as unknown as O
        case "Multi": return Multi.DefaultOptions as unknown as O
        case "File": return File.DefaultOptions as unknown as O
        case "MultiFile": return MultiFile.DefaultOptions as unknown as O
        case "Media": return Media.DefaultOptions as unknown as O
        case "MultiMedia": return MultiMedia.DefaultOptions as unknown as O
        case "Canvas": return Canvas.DefaultOptions as unknown as O
        case "CanvasGroup": return CanvasGroup.DefaultOptions as unknown as O
        case "CanvasGroupLink": return CanvasGroupLink.DefaultOptions as unknown as O
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
        case "Cycle": return new (Cycle.settingsModal(base as unknown as Constructor<ISettingsModal<Cycle.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Boolean": return new (Boolean.settingsModal(base as unknown as Constructor<ISettingsModal<Boolean.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Date": return new (Date.settingsModal(base as unknown as Constructor<ISettingsModal<Date.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "DateTime": return new (DateTime.settingsModal(base as unknown as Constructor<ISettingsModal<DateTime.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Time": return new (Time.settingsModal(base as unknown as Constructor<ISettingsModal<Time.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Multi": return new (Multi.settingsModal(base as unknown as Constructor<ISettingsModal<Multi.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "File": return new (File.settingsModal(base as unknown as Constructor<ISettingsModal<File.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "MultiFile": return new (MultiFile.settingsModal(base as unknown as Constructor<ISettingsModal<MultiFile.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Media": return new (Media.settingsModal(base as unknown as Constructor<ISettingsModal<Media.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "MultiMedia": return new (MultiMedia.settingsModal(base as unknown as Constructor<ISettingsModal<MultiMedia.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Canvas": return new (Canvas.settingsModal(base as unknown as Constructor<ISettingsModal<Canvas.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "CanvasGroup": return new (CanvasGroup.settingsModal(base as unknown as Constructor<ISettingsModal<CanvasGroup.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "CanvasGroupLink": return new (CanvasGroupLink.settingsModal(base as unknown as Constructor<ISettingsModal<CanvasGroupLink.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldModal<O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): IBaseValueModal<Target> | undefined {
    switch (managedField.type) {
        case "Input": return new (Input.valueModal(managedField as unknown as IFieldManager<Target, Input.Options>, plugin))()
        case "Select": return new (Select.valueModal(managedField as unknown as IFieldManager<Target, Select.Options>, plugin))()
        case "Cycle": return new (Cycle.valueModal(managedField as unknown as IFieldManager<Target, Cycle.Options>, plugin))()
        case "Boolean": return new (Boolean.valueModal(managedField as unknown as IFieldManager<Target, Boolean.Options>, plugin))()
        case "Date": return new (Date.valueModal(managedField as unknown as IFieldManager<Target, Date.Options>, plugin))()
        case "DateTime": return new (DateTime.valueModal(managedField as unknown as IFieldManager<Target, DateTime.Options>, plugin))()
        case "Time": return new (Time.valueModal(managedField as unknown as IFieldManager<Target, Time.Options>, plugin))()
        case "Multi": return new (Multi.valueModal(managedField as unknown as IFieldManager<Target, Multi.Options>, plugin))()
        case "File": return new (File.valueModal(managedField as unknown as IFieldManager<Target, File.Options>, plugin))()
        case "MultiFile": return new (MultiFile.valueModal(managedField as unknown as IFieldManager<Target, MultiFile.Options>, plugin))()
        case "Media": return new (Media.valueModal(managedField as unknown as IFieldManager<Target, Media.Options>, plugin))()
        case "MultiMedia": return new (MultiMedia.valueModal(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, plugin))()
        default: return undefined
    }
}

export function getFieldClass(type: FieldType): Constructor<IFieldBase> {
    switch (type) {
        case "Input": return Input.Base
        case "Select": return Select.Base
        case "Cycle": return Cycle.Base
        case "Boolean": return Boolean.Base
        case "Date": return Date.Base
        case "DateTime": return DateTime.Base
        case "Time": return Time.Base
        case "Multi": return Multi.Base
        case "File": return File.Base
        case "MultiFile": return MultiFile.Base
        case "Media": return Media.Base
        case "MultiMedia": return MultiMedia.Base
        case "Canvas": return Canvas.Base
        case "CanvasGroup": return CanvasGroup.Base
        case "CanvasGroupLink": return CanvasGroupLink.Base
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export type displayValueFunction = (managedField: IFieldManager<Target, BaseOptions>, container: HTMLDivElement, onClicked?: () => any) => void

export function displayValue(type: FieldType): displayValueFunction {
    switch (type) {
        case "Input": return Input.displayValue
        case "Select": return Select.displayValue
        case "Cycle": return Cycle.displayValue
        case "Boolean": return Boolean.displayValue
        case "Date": return Date.displayValue
        case "DateTime": return DateTime.displayValue
        case "Time": return Time.displayValue
        case "Multi": return Multi.displayValue
        case "File": return File.displayValue
        case "MultiFile": return MultiFile.displayValue
        case "Media": return Media.displayValue
        case "MultiMedia": return MultiMedia.displayValue
        case "Canvas": return Canvas.displayValue
        case "CanvasGroup": return CanvasGroup.displayValue
        case "CanvasGroupLink": return CanvasGroupLink.displayValue
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export type getActionFunction = (plugin: MetadataMenu, field: LegacyField, file: TFile, location: Menu | FieldCommandSuggestModal | FieldActions, indexedPath?: string) => void

export function getActions(type: FieldType): getActionFunction {
    switch (type) {
        case "Input": return Input.actions
        case "Select": return Select.actions
        case "Cycle": return Cycle.actions
        case "Boolean": return Boolean.actions
        case "Date": return Date.actions
        case "DateTime": return DateTime.actions
        case "Time": return Time.actions
        case "Multi": return Multi.actions
        case "File": return File.actions
        case "MultiFile": return MultiFile.actions
        case "Media": return Media.actions
        case "MultiMedia": return MultiMedia.actions
        default: return (...rest: any[]) => { };
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
        case "Cycle": return Cycle.createDvField(managedField as unknown as IFieldManager<Target, Cycle.Options>, dv, p, fieldContainer, attrs)
        case "Boolean": return Boolean.createDvField(managedField as unknown as IFieldManager<Target, Boolean.Options>, dv, p, fieldContainer, attrs)
        case "Date": return Date.createDvField(managedField as unknown as IFieldManager<Target, Date.Options>, dv, p, fieldContainer, attrs)
        case "DateTime": return DateTime.createDvField(managedField as unknown as IFieldManager<Target, DateTime.Options>, dv, p, fieldContainer, attrs)
        case "Time": return Time.createDvField(managedField as unknown as IFieldManager<Target, Time.Options>, dv, p, fieldContainer, attrs)
        case "Multi": return Multi.createDvField(managedField as unknown as IFieldManager<Target, Multi.Options>, dv, p, fieldContainer, attrs)
        case "File": return File.createDvField(managedField as unknown as IFieldManager<Target, File.Options>, dv, p, fieldContainer, attrs)
        case "MultiFile": return MultiFile.createDvField(managedField as unknown as IFieldManager<Target, MultiFile.Options>, dv, p, fieldContainer, attrs)
        case "Media": return Media.createDvField(managedField as unknown as IFieldManager<Target, Media.Options>, dv, p, fieldContainer, attrs)
        case "MultiMedia": return MultiMedia.createDvField(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, dv, p, fieldContainer, attrs)
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
        default: {
            const fieldValue = dv.el('span', p[managedField.name], attrs);
            fieldContainer.appendChild(fieldValue);
        }
    }
}

export type getOptionStrFunction = (managedField: IFieldManager<Target, BaseOptions>) => string

export function getOptionStr(type: FieldType): getOptionStrFunction {
    switch (type) {
        case "Input": return Input.getOptionsStr
        case "Select": return Select.getOptionsStr
        case "Cycle": return Cycle.getOptionsStr
        case "Boolean": return Boolean.getOptionsStr
        case "Date": return Date.getOptionsStr
        case "DateTime": return DateTime.getOptionsStr
        case "Time": return Time.getOptionsStr
        case "Multi": return Multi.getOptionsStr
        case "File": return File.getOptionsStr
        case "MultiFile": return MultiFile.getOptionsStr
        case "Media": return Media.getOptionsStr
        case "MultiMedia": return MultiMedia.getOptionsStr
        default: return () => ""
    }
}

export type geValidateValueFunction = (managedField: IFieldManager<Target, BaseOptions>) => void

export function validateValue(type: FieldType): geValidateValueFunction {
    switch (type) {
        case "Input": return Input.validateValue
        case "Select": return Select.validateValue
        case "Cycle": return Cycle.validateValue
        case "Boolean": return Boolean.validateValue
        case "Date": return Date.validateValue
        case "DateTime": return DateTime.validateValue
        case "Time": return Time.validateValue
        case "Multi": return Multi.validateValue
        case "File": return File.validateValue
        case "MultiFile": return MultiFile.validateValue
        case "Media": return Media.validateValue
        case "MultiMedia": return MultiMedia.validateValue
        case "Canvas": return Canvas.validateValue
        case "CanvasGroup": return CanvasGroup.validateValue
        case "CanvasGroupLink": return CanvasGroupLink.validateValue
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