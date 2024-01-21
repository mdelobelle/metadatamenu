
import MetadataMenu from "main";
import * as AbstractList from "./abstractModels/AbstractList"
import { ISettingsModal } from "../base/BaseSetting";
import { IFieldManager, Target, getOptions } from "../Field";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";
import { TFile, setIcon } from "obsidian";

export class Base implements IFieldBase {
    type = <const>"Select"
    tagName = "select"
    icon = "arrow"
    tooltip = "Accepts a single value from a list"
    colorClass = "select"
}

export interface Options extends AbstractList.Options { }

export const DefaultOptions: AbstractList.DefaultedOptions = AbstractList.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = AbstractList.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<AbstractList.IListBasedModal<Target>> {
    const base = AbstractList.valueModal(managedField, plugin)
    return class ValueModal extends base {
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings();
            this.managedField.value = this.inputEl.value
            this.managedField.save()
            this.close();
        }

        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
            el.addClass("value-container")
            if (value === this.managedField.value) el.addClass("value-checked")
        }
        onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
            this.managedField.value = item
            managedField.save()
        }
    }
}

export function displayValue(managedField: IFieldManager<Target>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractList.displayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    fieldContainer.appendChild(dv.el('span', p[managedField.name] || "", attrs))
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