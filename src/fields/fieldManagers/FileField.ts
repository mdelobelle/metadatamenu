import { FieldType } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { App, TFile, Menu, TextComponent, TextAreaComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import main from "main";
import FileFuzzySuggestModal from "src/optionModals/fileFuzzySuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";

export default class FileField extends FieldManager {

    private fileValidatorField: HTMLDivElement
    private dvQueryString: TextAreaComponent

    constructor(field: Field) {
        super(field, FieldType.File)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new FileFuzzySuggestModal(app, file, this.field, value)
        modal.titleEl.setText("Select value");
        if (FileField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon('search');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            });
        } else if (FileField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new FileFuzzySuggestModal(app, file, this.field, "", lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(plugin: main, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls: string; attr: Record<string, string>; }): Promise<void> {
        return dv.el("span", "-");
    }

    createFileContainer(parentContainer: HTMLDivElement): void {
        const dvQueryStringContainer = parentContainer.createDiv();
        dvQueryStringContainer.createEl("span", { text: "Dataview Query (optional)", cls: 'metadata-menu-field-option' });
        this.dvQueryString = new TextAreaComponent(dvQueryStringContainer);
        this.dvQueryString.inputEl.cols = 60;
        this.dvQueryString.inputEl.rows = 6;
        this.dvQueryString.setValue(this.field.options.dvQueryString || "");

        this.dvQueryString.onChange(value => {
            this.field.options.dvQueryString = value;
            FieldSettingsModal.removeValidationError(this.dvQueryString);
        })
    }

    createSettingContainer(parentContainer: HTMLDivElement, plugin: main, location?: SettingLocation): void {
        this.fileValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createFileContainer(this.fileValidatorField)
        this.fileValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    getOptionsStr(): string {
        return this.field.options.dvQueryString || "";
    }

    validateOptions(): boolean {
        return true;
    }
}