
import MetadataMenu from "main";
import * as ListBasedField from "./baseModels/ListBasedField"
import { ISettingsModal } from "../base/BaseSetting";
import { IFieldManager, Target } from "../Field";
import { FieldType } from "../Fields";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";
import { TFile, setIcon } from "obsidian";

export class Base implements IFieldBase {
    type = FieldType.Select
    tagName = "select"
    icon = "arrow"
    tooltip = "Accepts a single value from a list"
    colorClass = "select"
}

export interface Options extends ListBasedField.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = ListBasedField.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<ListBasedField.IListBasedModal<Target>> {
    const base = ListBasedField.valueModal(managedField, plugin)
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