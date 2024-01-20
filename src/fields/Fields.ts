
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
import { IField, IFieldManager, Target } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"
import { ModalType } from "./base/BaseModal"
import { IFieldBase } from "./base/BaseField"
import { Constructor } from "src/typings/types"

//TODO next Media and Multi Media (similar to file)

//#region Types

/*
** Types and utils
*/

export enum FieldType {
    Input = "Input",
    Select = "Select",
    Multi = "Multi",
    File = "File",
    MultiFile = "MultiFile",
    Media = "Media",
    MultiMedia = "MultiMedia",
    Formula = "Formula",
    ObjectList = "ObjectList"
}

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

export const fieldTypes: Array<keyof typeof FieldType> = [
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

export function getFieldType(type: keyof typeof FieldType): FieldType {
    switch (type) {
        case "Input": return FieldType.Input
        case "Select": return FieldType.Select
        case "Multi": return FieldType.Multi
        case "File": return FieldType.File
        case "Media": return FieldType.Media
        case "MultiMedia": return FieldType.MultiMedia
        case "MultiFile": return FieldType.MultiFile
        case "Formula": return FieldType.Formula
        case "ObjectList": return FieldType.ObjectList
    }
}

export function getFieldSettings(Field: Constructor<IField>,
    type: keyof typeof FieldType,
    plugin: MetadataMenu,
    parentSetting?: FieldSetting,
    parentSettingContainer?: HTMLElement): ISettingsModal {
    const base = buildSettingsModal(Field, plugin, parentSetting, parentSettingContainer)
    switch (type) {
        case "Input": return new (Input.settingsModal(base))()
        case "Select": return new (Select.settingsModal(base))()
        case "Multi": return new (Multi.settingsModal(base))()
        case "File": return new (File.settingsModal(base))
        case "MultiFile": return new (MultiFile.settingsModal(base))
        case "Media": return new (Media.settingsModal(base))
        case "MultiMedia": return new (MultiMedia.settingsModal(base))
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): ModalType {
    switch (managedField.type) {
        case "Input": return new (Input.valueModal(managedField, plugin))()
        case "Select": return new (Select.valueModal(managedField, plugin))()
        case "Multi": return new (Multi.valueModal(managedField, plugin))()
        case "File": return new (File.valueModal(managedField, plugin))()
        case "MultiFile": return new (MultiFile.valueModal(managedField, plugin))()
        case "Media": return new (Media.valueModal(managedField, plugin))()
        case "MultiMedia": return new (MultiMedia.valueModal(managedField, plugin))()
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldClass(type: keyof typeof FieldType): Constructor<IFieldBase> {
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
    }
}

export function createDvField(
    managedField: IFieldManager<Target> | undefined,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    if (!managedField) return
    managedField.value = p[managedField.name] || ""
    switch (managedField.type) {
        case "Input": return Input.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "Select": return Select.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "Multi": return Multi.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "File": return File.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "MultiFile": return MultiFile.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "Media": return Media.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "MultiMedia": return MultiMedia.createDvField(managedField, dv, p, fieldContainer, attrs)
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getIcon(type: keyof typeof FieldType): string {
    const c = getFieldClass(type)
    return new c().icon
}

//#endregion

//TODO remplir les create settings container et les fields options