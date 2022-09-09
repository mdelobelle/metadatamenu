import MetadataMenu from "main";
import { Menu, Notice, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SingleFileModal from "src/optionModals/fields/SingleFileModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";

export default class FileField extends FieldManager {

    private fileValidatorField: HTMLDivElement
    private dvQueryString: TextAreaComponent

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.File)
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
        const dataview = this.plugin.app.plugins.plugins["dataview"]
        //@ts-ignore
        if (this.field.options.dvQueryString && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
            try {
                const filesPath = getResults(dataview.api).values.map((v: any) => v.file.path)
                return this.plugin.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
            } catch (error) {
                throw (error);
            }
        } else {
            return this.plugin.app.vault.getMarkdownFiles();
        }
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new SingleFileModal(this.plugin, file, this.field, value)
        modal.titleEl.setText("Select value");
        if (FileField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.File]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            });
        } else if (FileField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.File]
            });
        };
    }

    createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new SingleFileModal(this.plugin, file, this.field, value, lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    async createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): Promise<void> {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        const searchBtn = document.createElement("button")
        setIcon(searchBtn, FieldIcon[FieldType.File])
        searchBtn.addClass("metadata-menu-dv-field-button")
        /* end spacer */
        const spacer = document.createElement("div")
        spacer.setAttr("class", "metadata-menu-dv-field-spacer")

        const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        let fieldModal: SingleFileModal;
        if (file instanceof TFile && file.extension == "md") {
            fieldModal = new SingleFileModal(this.plugin, file, this.field, p[this.field.name])
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
        searchBtn.onclick = () => {
            fieldModal.open()
        }

        if (!attrs?.options?.alwaysOn) {
            searchBtn.hide()
            spacer.show()
            fieldContainer.onmouseover = () => {
                searchBtn.show()
                spacer.hide()
            }
            fieldContainer.onmouseout = () => {
                searchBtn.hide()
                spacer.show()
            }
        }

        /* initial state */
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(searchBtn);
        fieldContainer.appendChild(spacer);
    }

    createFileContainer(parentContainer: HTMLDivElement): void {
        const dvQueryStringContainer = parentContainer.createDiv();
        dvQueryStringContainer.createEl("span", { text: "Dataview Query (optional)", cls: 'metadata-menu-field-option' });
        this.dvQueryString = new TextAreaComponent(dvQueryStringContainer);
        this.dvQueryString.inputEl.cols = 50;
        this.dvQueryString.inputEl.rows = 4;
        this.dvQueryString.setValue(this.field.options.dvQueryString || "");

        this.dvQueryString.onChange(value => {
            this.field.options.dvQueryString = value;
            FieldSettingsModal.removeValidationError(this.dvQueryString);
        })
    }

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
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

    async validateValue(value: string): Promise<boolean> {
        const basename = value.trim().replace(/^\[\[/g, "").replace(/\]\]$/g, "");
        return !!this.getFiles().map(f => f.basename).find(item => item === basename);
    }
}