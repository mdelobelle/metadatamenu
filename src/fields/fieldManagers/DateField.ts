import { FieldType } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { App, TFile, Menu, TextComponent, ToggleComponent, Notice } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import { moment } from "obsidian";
import DateModal from "src/optionModals/fields/DateModal";

export default class DateField extends FieldManager {

    dateValidatorField: HTMLDivElement

    constructor(field: Field) {
        super(field, FieldType.Date)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new DateModal(app, file, this.field, value);
        modal.titleEl.setText(`Change date for <${name}>`);
        if (DateField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon('calendar-glyph');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            })
        } else if (DateField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new DateModal(app, file, this.field, "", lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Enter date for ${selectedFieldName}`);
        fieldModal.open();
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
        defaultInsertAsLink.setValue(DateField.stringToBoolean(this.field.options.defaultInsertAsLink || "false"))
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

    validateValue(value: string): Promise<boolean> {
        return Promise.resolve(moment(value).isValid())
    }
}