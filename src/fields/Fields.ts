
import { MultiBase, MultiOptions, multiSettingsModal } from "./models/Multi"
import { InputBase, InputOptions, inputSettingsModal } from "./models/Input"
import { SelectBase, SelectOptions, selectSettingsModal } from "./models/Select"
import { FormulaBase, FormulaOptions, formulaSettingsModal } from "./models/Formula"
import { ObjectListBase, ObjectListOptions, objectListSettingsModal } from "./models/ObjectList"
import { FieldType, IFieldBase } from "./BaseField"
import { ISettingsModal, buildSettingsModal } from "./BaseSetting"
import { IField, IManagedField, ModalType, Target, basicModal, listBasedModal } from "./Field"
import MetadataMenu from "main"
import FieldSetting from "src/settings/FieldSetting"

// Factories

export type Constructor<T> = new (...args: any[]) => T;

export const getFieldType = (type: keyof typeof FieldType): FieldType => {
    switch (type) {
        case "Input": return FieldType.Input;
        case "Select": return FieldType.Select;
        case "Multi": return FieldType.Multi;
        case "Formula": return FieldType.Formula
        case "ObjectList": return FieldType.ObjectList
    }
};

export const getFieldClass = (type: keyof typeof FieldType): Constructor<IFieldBase> => {
    switch (type) {
        case "Input": return InputBase;
        case "Select": return SelectBase;
        case "Multi": return MultiBase;
        case "Formula": return FormulaBase
        case "ObjectList": return ObjectListBase
    }
};

export const getFieldSettings = (
    Field: Constructor<IField>,
    type: keyof typeof FieldType,
    plugin: MetadataMenu,
    parentSetting?: FieldSetting,
    parentSettingContainer?: HTMLElement
): ISettingsModal => {
    const base = buildSettingsModal(Field, plugin, parentSetting, parentSettingContainer)
    switch (type) {
        case "Input": return new (inputSettingsModal(base))();
        case "Select": return new (selectSettingsModal(base))();
        case "Multi": return new (multiSettingsModal(base))();
        case "Formula": return new (formulaSettingsModal(base))();
        case "ObjectList": return new (objectListSettingsModal(base))();
    }
};

export const getFieldModal = (managedField: IManagedField<Target>, plugin: MetadataMenu): ModalType => {
    switch (managedField.type) {
        case "Input": return new (basicModal(managedField, plugin))();
        case "Select": return new (listBasedModal(managedField, plugin))();
        case "Multi": return new (listBasedModal(managedField, plugin))();
        case "Formula": return new (basicModal(managedField, plugin))();
        case "ObjectList": return new (basicModal(managedField, plugin))();
    }
}

export interface TypesOptionsMap {
    Input: InputOptions,
    Select: SelectOptions,
    Formula: FormulaOptions,
    Multi: MultiOptions,
    ObjectList: ObjectListOptions
}

//TODO remplir les create settings container et les fields options