import { TFile } from "obsidian"
import { IFieldBase } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import * as AbstractDate from "./abstractModels/AbstractDate"
import { ActionLocation, IField, IFieldManager, LegacyField, Target } from "../Field"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"

export class Base implements IFieldBase {
    type = <const>"Date"
    tagName = "date"
    icon = "calendar-with-checkmark"
    tooltip = "Accepts a date"
    colorClass = "date"
}

export interface Options extends AbstractDate.Options { }
export interface DefaultedOptions extends AbstractDate.DefaultedOptions { }
export const DefaultOptions: AbstractDate.DefaultedOptions = AbstractDate.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal<AbstractDate.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractDate.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractDate.Modal<Target>> {
    const base = AbstractDate.valueModal(managedField, plugin)
    return class ValueModal extends base { }
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

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractDate.actions(plugin, field, file, location, indexedPath)
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractDate.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractDate.validateValue(managedField)
}
