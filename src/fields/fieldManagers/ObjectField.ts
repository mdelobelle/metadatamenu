import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";

import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { TFile, Menu } from "obsidian";
import { FieldOptions } from "src/components/NoteFields";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { postValues } from "src/commands/postValues";

export default class ObjectField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Object)
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {

    }
    validateOptions(): boolean {
        return true
    }
    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {

    }
    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {
        const fieldValue = dv.el('span', "{...}", attrs);
        fieldContainer.appendChild(fieldValue);
    }
    getOptionsStr(): string {
        return ""
    }
    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {
        await postValues(this.plugin, [{ id: this.field.id, payload: { value: "" } }], file, lineNumber, after, asList, asComment)
    }
    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        container.setText("")
    }

}