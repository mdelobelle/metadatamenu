
import * as Input from "./models/Input"
import * as NumberField from "./models/Number"
import * as Select from "./models/Select"
import * as Multi from "./models/Multi"
import * as Cycle from "./models/Cycle"
import * as BooleanField from "./models/Boolean"
import * as DateField from "./models/Date"
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
import * as Lookup from "./models/Lookup"
import * as JSONField from "./models/JSON"
import * as YAML from "./models/YAML"
import * as ObjectField from "./models/Object"
import * as ObjectList from "./models/ObjectList"
import { ISettingsModal, buildSettingsModal } from "./base/BaseSetting"
import { IField, IFieldManager, Target, field } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"
import { IBaseValueModal } from "./base/BaseModal"
import { IFieldBase, BaseOptions } from "./base/BaseField"
import { Constructor } from "src/typings/types"
import { Menu, TFile } from "obsidian"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import NoteFieldsComponent, { FieldActions } from "src/components/FieldsModal"


//TODO next Media and Multi Media (similar to file)

//#region Types

/*
** Types and utils
*/

export type FieldType =
    | "Input"
    | "Number"
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
    | "Lookup"
    | "JSON"
    | "YAML"
    | "Object"
    | "ObjectList"

export interface TypesOptionsMap {
    Input: Input.Options
    Number: NumberField.Options
    Select: Select.Options
    Multi: Multi.Options
    Cycle: Cycle.Options
    Boolean: BooleanField.Options
    Date: DateField.Options
    DateTime: DateTime.Options
    Time: Time.Options
    File: File.Options
    MultiFile: MultiFile.Options
    Media: Media.Options
    MultiMedia: MultiMedia.Options
    Canvas: Canvas.Options
    CanvasGroup: CanvasGroup.Options
    CanvasGroupLink: CanvasGroupLink.Options
    Formula: Formula.Options
    Lookup: Lookup.Options
    JSON: JSONField.Options
    YAML: YAML.Options
    Object: ObjectField.Options
    ObjectList: ObjectList.Options
}

export const fieldTypes: Array<FieldType> = [
    "Input",
    "Number",
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
    "Lookup",
    "JSON",
    "YAML",
    "Object",
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

export const rawObjectTypes = [
    "YAML",
    "JSON"
]

export enum MultiDisplayType {
    "asArray" = 'asArray', //YAML flow style
    "asList" = "asList" //YAML block style
}


export const rootOnlyTypes = [
    "Canvas",
    "CanvasGroup",
    "CanvasGroupLink",
    "Lookup",
    "Formula"
]

export type DateBasedType = "Date" | "DateTime"

export const ReservedMultiAttributes = ["tags", "tagNames", "excludes", "aliases"]

//#endregion

//#region Factories

/*
** Factories from type
*/

export function getDefaultOptions<O extends BaseOptions>(type: FieldType): O {
    switch (type) {
        case "Input": return Input.DefaultOptions as unknown as O
        case "Number": return NumberField.DefaultOptions as unknown as O
        case "Select": return Select.DefaultOptions as unknown as O
        case "Cycle": return Cycle.DefaultOptions as unknown as O
        case "Boolean": return BooleanField.DefaultOptions as unknown as O
        case "Date": return DateField.DefaultOptions as unknown as O
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
        case "Formula": return Formula.DefaultOptions as unknown as O
        case "Lookup": return Lookup.DefaultOptions as unknown as O
        case "JSON": return JSONField.DefaultOptions as unknown as O
        case "YAML": return YAML.DefaultOptions as unknown as O
        case "Object": return ObjectField.DefaultOptions as unknown as O
        case "ObjectList": return ObjectList.DefaultOptions as unknown as O
    }
}

export function getFieldSettingsModal<O extends BaseOptions>(Field: Constructor<IField<O>>,
    type: FieldType,
    plugin: MetadataMenu,
    parentSetting?: FieldSetting,
    parentSettingContainer?: HTMLElement): ISettingsModal<O> {
    const base = buildSettingsModal<O>(Field, plugin, parentSetting, parentSettingContainer)
    switch (type) {
        case "Input": return new (Input.settingsModal(base as unknown as Constructor<ISettingsModal<Input.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Number": return new (NumberField.settingsModal(base as unknown as Constructor<ISettingsModal<NumberField.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Select": return new (Select.settingsModal(base as unknown as Constructor<ISettingsModal<Select.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Cycle": return new (Cycle.settingsModal(base as unknown as Constructor<ISettingsModal<Cycle.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Boolean": return new (BooleanField.settingsModal(base as unknown as Constructor<ISettingsModal<BooleanField.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Date": return new (DateField.settingsModal(base as unknown as Constructor<ISettingsModal<DateField.DefaultedOptions>>))() as unknown as ISettingsModal<O>
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
        case "Formula": return new (Formula.settingsModal(base as unknown as Constructor<ISettingsModal<Formula.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Lookup": return new (Lookup.settingsModal(base as unknown as Constructor<ISettingsModal<Lookup.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "JSON": return new (JSONField.settingsModal(base as unknown as Constructor<ISettingsModal<JSONField.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "YAML": return new (YAML.settingsModal(base as unknown as Constructor<ISettingsModal<YAML.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "Object": return new (ObjectField.settingsModal(base as unknown as Constructor<ISettingsModal<ObjectField.DefaultedOptions>>))() as unknown as ISettingsModal<O>
        case "ObjectList": return new (ObjectList.settingsModal(base as unknown as Constructor<ISettingsModal<ObjectList.DefaultedOptions>>))() as unknown as ISettingsModal<O>
    }
}

export function getFieldModal<O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): IBaseValueModal<Target> | undefined {
    switch (managedField.type) {
        case "Input": return new (Input.valueModal(managedField as unknown as IFieldManager<Target, Input.Options>, plugin))()
        case "Number": return new (NumberField.valueModal(managedField as unknown as IFieldManager<Target, NumberField.Options>, plugin))()
        case "Select": return new (Select.valueModal(managedField as unknown as IFieldManager<Target, Select.Options>, plugin))()
        case "Cycle": return new (Cycle.valueModal(managedField as unknown as IFieldManager<Target, Cycle.Options>, plugin))()
        case "Boolean": return new (BooleanField.valueModal(managedField as unknown as IFieldManager<Target, BooleanField.Options>, plugin))()
        case "Date": return new (DateField.valueModal(managedField as unknown as IFieldManager<Target, DateField.Options>, plugin))()
        case "DateTime": return new (DateTime.valueModal(managedField as unknown as IFieldManager<Target, DateTime.Options>, plugin))()
        case "Time": return new (Time.valueModal(managedField as unknown as IFieldManager<Target, Time.Options>, plugin))()
        case "Multi": return new (Multi.valueModal(managedField as unknown as IFieldManager<Target, Multi.Options>, plugin))()
        case "File": return new (File.valueModal(managedField as unknown as IFieldManager<Target, File.Options>, plugin))()
        case "MultiFile": return new (MultiFile.valueModal(managedField as unknown as IFieldManager<Target, MultiFile.Options>, plugin))()
        case "Media": return new (Media.valueModal(managedField as unknown as IFieldManager<Target, Media.Options>, plugin))()
        case "MultiMedia": return new (MultiMedia.valueModal(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, plugin))()
        case "JSON": return new (JSONField.valueModal(managedField as unknown as IFieldManager<Target, JSONField.Options>, plugin))()
        case "YAML": return new (YAML.valueModal(managedField as unknown as IFieldManager<Target, YAML.Options>, plugin))()
        case "Object": return new (ObjectField.valueModal(managedField as unknown as IFieldManager<Target, ObjectField.Options>, plugin))()
        case "ObjectList": return new (ObjectList.valueModal(managedField as unknown as IFieldManager<Target, ObjectList.Options>, plugin))()
        default: return undefined
    }
}

export function getFieldClass(type: FieldType): Constructor<IFieldBase> {
    switch (type) {
        case "Input": return Input.Base
        case "Number": return NumberField.Base
        case "Select": return Select.Base
        case "Cycle": return Cycle.Base
        case "Boolean": return BooleanField.Base
        case "Date": return DateField.Base
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
        case "Formula": return Formula.Base
        case "Lookup": return Lookup.Base
        case "JSON": return JSONField.Base
        case "YAML": return YAML.Base
        case "Object": return ObjectField.Base
        case "ObjectList": return ObjectList.Base
    }
}

export type displayValueFunction = (managedField: IFieldManager<Target, BaseOptions>, container: HTMLDivElement, onClicked?: () => any) => void

export function displayValue(type: FieldType): displayValueFunction {
    switch (type) {
        case "Input": return Input.displayValue
        case "Number": return NumberField.displayValue
        case "Select": return Select.displayValue
        case "Cycle": return Cycle.displayValue
        case "Boolean": return BooleanField.displayValue
        case "Date": return DateField.displayValue
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
        case "JSON": return JSONField.displayValue
        case "YAML": return YAML.displayValue
        case "Formula": return Formula.displayValue
        case "Lookup": return Lookup.displayValue
        case "Object": return ObjectField.displayValue
        case "ObjectList": return ObjectList.displayValue
    }
}

export type getActionFunction = (plugin: MetadataMenu, field: IField<BaseOptions>, file: TFile, location: Menu | FieldCommandSuggestModal | FieldActions | "InsertFieldCommand" | "ManageAtCursorCommand", indexedPath?: string, noteFields?: NoteFieldsComponent) => void

export function getActions(type: FieldType): getActionFunction {
    switch (type) {
        case "Input": return Input.actions
        case "Number": return NumberField.actions
        case "Select": return Select.actions
        case "Cycle": return Cycle.actions
        case "Boolean": return BooleanField.actions
        case "Date": return DateField.actions
        case "DateTime": return DateTime.actions
        case "Time": return Time.actions
        case "Multi": return Multi.actions
        case "File": return File.actions
        case "MultiFile": return MultiFile.actions
        case "Media": return Media.actions
        case "MultiMedia": return MultiMedia.actions
        case "JSON": return JSONField.actions
        case "YAML": return YAML.actions
        case "Formula": return Formula.actions
        case "Lookup": return Lookup.actions
        case "Object": return ObjectField.actions
        case "ObjectList": return ObjectList.actions
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
        case "Number": return NumberField.createDvField(managedField as unknown as IFieldManager<Target, NumberField.Options>, dv, p, fieldContainer, attrs)
        case "Select": return Select.createDvField(managedField as unknown as IFieldManager<Target, Select.Options>, dv, p, fieldContainer, attrs)
        case "Cycle": return Cycle.createDvField(managedField as unknown as IFieldManager<Target, Cycle.Options>, dv, p, fieldContainer, attrs)
        case "Boolean": return BooleanField.createDvField(managedField as unknown as IFieldManager<Target, BooleanField.Options>, dv, p, fieldContainer, attrs)
        case "Date": return DateField.createDvField(managedField as unknown as IFieldManager<Target, DateField.Options>, dv, p, fieldContainer, attrs)
        case "DateTime": return DateTime.createDvField(managedField as unknown as IFieldManager<Target, DateTime.Options>, dv, p, fieldContainer, attrs)
        case "Time": return Time.createDvField(managedField as unknown as IFieldManager<Target, Time.Options>, dv, p, fieldContainer, attrs)
        case "Multi": return Multi.createDvField(managedField as unknown as IFieldManager<Target, Multi.Options>, dv, p, fieldContainer, attrs)
        case "File": return File.createDvField(managedField as unknown as IFieldManager<Target, File.Options>, dv, p, fieldContainer, attrs)
        case "MultiFile": return MultiFile.createDvField(managedField as unknown as IFieldManager<Target, MultiFile.Options>, dv, p, fieldContainer, attrs)
        case "Media": return Media.createDvField(managedField as unknown as IFieldManager<Target, Media.Options>, dv, p, fieldContainer, attrs)
        case "MultiMedia": return MultiMedia.createDvField(managedField as unknown as IFieldManager<Target, MultiMedia.Options>, dv, p, fieldContainer, attrs)
        case "Lookup": return Lookup.createDvField(managedField as unknown as IFieldManager<Target, Lookup.Options>, dv, p, fieldContainer, attrs)
        case "JSON": return JSONField.createDvField(managedField as unknown as IFieldManager<Target, JSONField.Options>, dv, p, fieldContainer, attrs)
        case "YAML": return YAML.createDvField(managedField as unknown as IFieldManager<Target, YAML.Options>, dv, p, fieldContainer, attrs)
        case "Object": return ObjectField.createDvField(managedField as unknown as IFieldManager<Target, ObjectField.Options>, dv, p, fieldContainer, attrs)
        case "ObjectList": return ObjectList.createDvField(managedField as unknown as IFieldManager<Target, ObjectList.Options>, dv, p, fieldContainer, attrs)
        default: {
            const fieldValue = dv.el('span', p[managedField.name], attrs);
            fieldContainer.appendChild(fieldValue);
        }
    }
}

export type getOptionStrFunction = (field: IField<BaseOptions>) => string

export function getOptionStr(type: FieldType): getOptionStrFunction {
    switch (type) {
        case "Input": return Input.getOptionsStr
        case "Number": return NumberField.getOptionsStr
        case "Select": return Select.getOptionsStr
        case "Cycle": return Cycle.getOptionsStr
        case "Boolean": return BooleanField.getOptionsStr
        case "Date": return DateField.getOptionsStr
        case "DateTime": return DateTime.getOptionsStr
        case "Time": return Time.getOptionsStr
        case "Multi": return Multi.getOptionsStr
        case "File": return File.getOptionsStr
        case "MultiFile": return MultiFile.getOptionsStr
        case "Media": return Media.getOptionsStr
        case "MultiMedia": return MultiMedia.getOptionsStr
        case "Lookup": return Lookup.getOptionsStr
        case "Object": return ObjectField.getOptionsStr
        case "ObjectList": return ObjectList.getOptionsStr
        default: return () => ""
    }
}

export type geValidateValueFunction = (managedField: IFieldManager<Target, BaseOptions>) => boolean

export function validateValue(type: FieldType): geValidateValueFunction {
    switch (type) {
        case "Input": return Input.validateValue
        case "Number": return NumberField.validateValue
        case "Select": return Select.validateValue
        case "Cycle": return Cycle.validateValue
        case "Boolean": return BooleanField.validateValue
        case "Date": return DateField.validateValue
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
        case "Formula": return Formula.validateValue
        case "Lookup": return Lookup.validateValue
        case "JSON": return JSONField.validateValue
        case "YAML": return YAML.validateValue
        case "Object": return ObjectField.validateValue
        case "ObjectList": return ObjectList.validateValue
    }
}

export function getIcon(type: FieldType): string {
    const c = getFieldClass(type)
    return new c().icon
}

export function getTagName(type: FieldType): string {
    const c = getFieldClass(type)
    return new c().tagName
}

export function getColorClass(type: FieldType): string {
    const c = getFieldClass(type)
    return new c().colorClass
}


export function getTooltip(type: FieldType): string {
    const c = getFieldClass(type)
    return new c().tooltip
}

//#endregion
//#region tests

export async function getFieldSettingsTest(settingModal: ISettingsModal<BaseOptions>, field: IField<BaseOptions>): Promise<void> {
    switch (settingModal.field.type) {
        case "Input": await Input.enterFieldSetting(settingModal as Input.ISettingsModal, field); break
        case "Select": await Select.enterFieldSetting(settingModal as Select.ISettingsModal, field as IField<Select.Options>); break
        case "Multi": await Multi.enterFieldSetting(settingModal as Multi.ISettingsModal, field as IField<Multi.Options>); break
        case "Cycle": await Cycle.enterFieldSetting(settingModal as Cycle.ISettingsModal, field as IField<Cycle.Options>); break
        case "Number": await NumberField.enterFieldSetting(settingModal as NumberField.ISettingsModal, field as IField<NumberField.Options>); break
        case "Boolean": await BooleanField.enterFieldSetting(settingModal as BooleanField.ISettingsModal, field as IField<BooleanField.Options>); break
        case "Date": await DateField.enterFieldSetting(settingModal as DateField.ISettingsModal, field as IField<DateField.Options>); break
        case "DateTime": await DateTime.enterFieldSetting(settingModal as DateTime.ISettingsModal, field as IField<DateTime.Options>); break
        case "Time": await Time.enterFieldSetting(settingModal as Time.ISettingsModal, field as IField<Time.Options>); break
        case "File":
        case "MultiFile":
        case "Media":
        case "MultiMedia":
        case "Canvas":
        case "CanvasGroup":
        case "CanvasGroupLink":
        case "Formula":
        case "Lookup":
        case "JSON":
        case "YAML":
        case "Object":
        case "ObjectList":
    }
}
//#endregion