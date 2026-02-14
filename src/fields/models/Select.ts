
import MetadataMenu from "main";
import * as AbstractList from "./abstractModels/AbstractList"
import { ISettingsModal as IBaseSettingsModal } from "../base/BaseSetting";
import { ActionLocation, baseGetValueString, IField, IFieldManager, Target } from "../Field";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";
import { TFile, setIcon } from "obsidian";

export class Base implements IFieldBase {
    type = <const>"Select"
    tagName = "select"
    icon = "right-triangle"
    tooltip = "Accepts a single value from a list"
    colorClass = "select"
}

export interface Options extends AbstractList.Options { }

export interface DefaultedOptions extends AbstractList.DefaultedOptions { }

export const DefaultOptions: AbstractList.DefaultedOptions = AbstractList.DefaultOptions

export interface ISettingsModal extends AbstractList.IListBaseSettingModal { }

export function settingsModal(Base: Constructor<IBaseSettingsModal<AbstractList.DefaultedOptions>>): Constructor<ISettingsModal> {
    return AbstractList.settingsModal(Base)
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractList.Modal<Target>> {
    const base = AbstractList.valueModal(managedField, plugin)
    return class ValueModal extends base {
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings();
            managedField.save(this.inputEl.value)
            this.close();
        }

        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
            el.addClass("value-container")
            if (value === managedField.value) el.addClass("value-checked")
        }
        onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
            this.saved = true
            managedField.save(item)
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return baseGetValueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractList.displayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    fieldContainer.appendChild(dv.el('span', managedField.value || "", attrs))
    /* end spacer */
    const spacer = fieldContainer.createEl("div", { cls: "spacer-1" })
    /* button to display modal */
    const dropDownButton = fieldContainer.createEl("button");
    setIcon(dropDownButton, "down-chevron-glyph");
    const file = managedField.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
    if (file instanceof TFile && file.extension == "md") {
        dropDownButton.onclick = async () => managedField.openModal()
    } else {
        dropDownButton.onclick = () => { }
    }
    if (!attrs?.options?.alwaysOn) {
        dropDownButton.hide();
        spacer.show();
        fieldContainer.onmouseover = () => {
            dropDownButton.show();
            spacer.hide();
        }
        fieldContainer.onmouseout = () => {
            dropDownButton.hide();
            spacer.show();
        }
    }
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractList.actions(plugin, field, file, location, indexedPath)
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractList.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractList.getOptionsList(managedField).includes(managedField.value)
}

//#region test
export async function enterFieldSetting(settingModal: ISettingsModal, field: IField<Options>, speed = 100) {
    return AbstractList.enterFieldSetting(settingModal, field, speed)
}

//#endregion