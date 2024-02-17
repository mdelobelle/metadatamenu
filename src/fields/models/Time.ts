import { TFile } from "obsidian"
import { IFieldBase } from "../base/BaseField"
import { ISettingsModal as BaseSettingsModal } from "../base/BaseSetting"
import * as AbstractDate from "./abstractModels/AbstractDate"
import { ActionLocation, IField, IFieldManager, Target } from "../Field"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"

export class Base implements IFieldBase {
    type = <const>"Time"
    tagName = "time"
    icon = "clock-4"
    tooltip = "Accepts a time"
    colorClass = "time"
}

export interface Options extends AbstractDate.Options { }
export interface DefaultedOptions extends AbstractDate.DefaultedOptions { }
export const DefaultOptions: AbstractDate.DefaultedOptions = {
    ...AbstractDate.DefaultOptions,
    dateFormat: "HH:mm",
    dateShiftInterval: "1 hour"
}
export interface ISettingsModal extends AbstractDate.IDateBaseSettingModal { }

export function settingsModal(Base: Constructor<BaseSettingsModal<AbstractDate.DefaultedOptions>>): Constructor<ISettingsModal> {
    const base = AbstractDate.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractDate.Modal<Target>> {
    const base = AbstractDate.valueModal(managedField, plugin)
    return class ValueModal extends base {
        buildInputEl: (dateFieldsContainer: HTMLDivElement) => Promise<void>
        buildInsertAsLinkButton: (dateFieldsContainer: HTMLDivElement) => void
        buildClearBtn: (dateFieldsContainer: HTMLDivElement) => void
        buildSaveBtn: (dateFieldsContainer: HTMLDivElement) => void

        public async buildFields(dateFieldsContainer: HTMLDivElement): Promise<void> {
            await this.buildInputEl(dateFieldsContainer);
            this.buildClearBtn(dateFieldsContainer);
            this.buildSaveBtn(dateFieldsContainer);
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>) {
    return AbstractDate.valueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractDate.displayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    return AbstractDate.createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractDate.actions(plugin, field, file, location, indexedPath)
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractDate.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractDate.validateValue(managedField)
}


//#region tests

export async function enterFieldSetting(settingModal: ISettingsModal, field: IField<Options>, speed = 100) {
    AbstractDate.enterFieldSetting(settingModal, field, speed)
}

//#endregion