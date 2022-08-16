import { FieldType } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { App, TFile, Menu, TextComponent, ToggleComponent, Notice } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import { moment } from "obsidian";
import BooleanField from "./BooleanField";

export default class FileField extends FieldManager {

    dateValidatorField: HTMLDivElement

    constructor(field: Field) {
        super(field, FieldType.Date)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {

    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {

    }

    createDateContainer(parentContainer: HTMLDivElement): void {
        const dateFormatContainer = parentContainer.createDiv();
        dateFormatContainer.createEl("span", { text: "Date format", cls: 'metadata-menu-field-option' })
        const dateFormatInput = new TextComponent(dateFormatContainer)
        dateFormatInput.setValue(this.field.options.dateFormat || "YYYY-MM-DD")
        const dateExample = dateFormatContainer.createEl("span", { text: "", cls: 'metadata-menu-field-option' })
        dateExample.setText(`example: ${moment().format(dateFormatInput.getValue())}`)
        dateFormatInput.onChange((value: string) => {
            this.field.options.dateFormat = value
            dateExample.setText(`example: ${moment().format(value)}`);
        });
        const defaultInsertAsLinkContainer = parentContainer.createDiv();
        defaultInsertAsLinkContainer.createEl("span", { text: "Insert as link by default", cls: 'metadata-menu-field-option' });
        const defaultInsertAsLink = new ToggleComponent(defaultInsertAsLinkContainer);
        defaultInsertAsLink.setValue(BooleanField.stringToBoolean(this.field.options.defaultInsertAsLink || "false"))
        defaultInsertAsLink.onChange((value: boolean) => {
            this.field.options.defaultInsertAsLink = value.toString();
        });
    }

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.dateValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" });
        this.createDateContainer(this.dateValidatorField);
        this.dateValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    createDvField(plugin: MetadataMenu, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): Promise<void> {
        return Promise.resolve();
    }

    getOptionsStr(): string {
        return this.field.options.dateFormat;
    }

    validateOptions(): boolean {
        return true;
    }
}