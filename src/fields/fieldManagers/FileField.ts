import { FieldType } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { App, TFile, Menu, TextAreaComponent, Notice } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import main from "main";
import FileFuzzySuggester from "src/optionModals/fileFuzzySuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";

export default class FileField extends FieldManager {

    private fileValidatorField: HTMLDivElement
    private dvQueryString: TextAreaComponent

    constructor(field: Field) {
        super(field, FieldType.File)
    }

    static buildMarkDownLink(app: App, file: TFile, path: string): string {
        const destFile = app.metadataCache.getFirstLinkpathDest(path, file.path)
        if (destFile) {
            return app.fileManager.generateMarkdownLink(
                destFile,
                file.path,
                undefined,
                destFile.basename
            )
        }
        return ""
    }

    getFiles = (): TFile[] => {
        //@ts-ignore
        const getResults = (api: DataviewPlugin["api"]) => {
            try {
                return (new Function("dv", `return ${this.field.options.dvQueryString}`))(api)
            } catch (error) {
                new Notice(`Wrong query for field <${this.field.name}>\ncheck your settings`, 3000)
            }
        };
        const dataview = app.plugins.plugins["dataview"]
        //@ts-ignore
        if (this.field.options.dvQueryString && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            try {
                const filesPath = getResults(dataview.api).values.map((v: any) => v.file.path)
                return app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
            } catch (error) {
                throw (error);
            }
        } else {
            return app.vault.getMarkdownFiles();
        }
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new FileFuzzySuggester(app, file, this.field)
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
        const fieldModal = new FileFuzzySuggester(app, file, this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(plugin: main, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls: string; attr: Record<string, string>; }): Promise<void> {
        const fieldValueContainer = document.createElement("div")
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        const searchBtn = document.createElement("button")
        searchBtn.setText("🔎")
        searchBtn.addClass("metadata-menu-dv-field-button")
        fieldValueContainer.appendChild(fieldValue);
        fieldValueContainer.appendChild(searchBtn);
        const file = app.vault.getAbstractFileByPath(p["file"]["path"])
        let fieldModal: FileFuzzySuggester;
        if (file instanceof TFile && file.extension == "md") {
            fieldModal = new FileFuzzySuggester(app, file, this.field)
        } else {
            return Promise.reject("path doesn't correspond to a proper file");
        }
        searchBtn.onclick = () => {
            fieldModal.open()
        }
        /* initial state */
        fieldContainer.appendChild(fieldValueContainer)

        return Promise.resolve();
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