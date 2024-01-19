
import * as Multi from "./models/Multi"
import * as Input from "./models/Input"
import * as Select from "./models/Select"
import * as Formula from "./models/Formula"
import * as ObjectList from "./models/ObjectList"
import { ISettingsModal, buildSettingsModal } from "./base/BaseSetting"
import { IField, IFieldManager, Target } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"
import { ModalType } from "./base/BaseModal"
import { IFieldBase } from "./base/BaseField"

//Types

export interface TypesOptionsMap {
    Input: Input.Options,
    Select: Select.Options,
    Formula: Formula.Options,
    Multi: Multi.Options,
    ObjectList: ObjectList.Options
}

export const fieldTypes: Array<keyof typeof FieldType> = [
    "Input",
    "Select",
    "Multi",
    "Formula",
    "ObjectList"
]

export const multiTypes = [
    "Multi"
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

export enum FieldType {
    'Input' = "Input",
    'Select' = "Select",
    'Multi' = "Multi",
    "Formula" = "Formula",
    "ObjectList" = "ObjectList"
}

// Factories

export type Constructor<T> = new (...args: any[]) => T;

export function getFieldType(type: keyof typeof FieldType): FieldType {
    switch (type) {
        case "Input": return FieldType.Input
        case "Select": return FieldType.Select
        case "Multi": return FieldType.Multi
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
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): ModalType {
    switch (managedField.type) {
        case "Input": return new (Input.valueModal(managedField, plugin))()
        case "Select": return new (Select.valueModal(managedField, plugin))()
        case "Multi": return new (Multi.valueModal(managedField, plugin))()
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getFieldClass(type: keyof typeof FieldType): Constructor<IFieldBase> {
    switch (type) {
        case "Input": return Input.Base
        case "Select": return Select.Base
        case "Multi": return Multi.Base
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
        case "Select": throw Error("not implemented")
        case "Multi": throw Error("not implemented")
        case "Formula": throw Error("not implemented")
        case "ObjectList": throw Error("not implemented")
    }
}

export function getIcon(type: keyof typeof FieldType): string {
    const c = getFieldClass(type)
    return new c().icon
}
//TODO remplir les create settings container et les fields options