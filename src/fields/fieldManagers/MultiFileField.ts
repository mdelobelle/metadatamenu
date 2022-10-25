import MetadataMenu from "main";
import { Menu, Notice, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import MultiFileModal from "src/modals/fields/MultiFileModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";

export default class MultiFileField extends FieldManager {

    private fileValidatorField: HTMLDivElement
    private dvQueryString: TextAreaComponent

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.MultiFile)
    }

    static buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string): string {
        const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
        if (destFile) {
            return plugin.app.fileManager.generateMarkdownLink(
                destFile,
                file.path,
                undefined,
                destFile.basename
            )
        }
        return ""
    }

    private getFiles = (currentFile?: TFile): TFile[] => {
        //@ts-ignore
        const getResults = (api: DataviewPlugin["api"]) => {
            try {
                return (new Function("dv", "current", `return ${this.field.options.dvQueryString}`))(api, api.page(currentFile?.path))
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

    public addFieldOption(name: string, value: any, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new MultiFileModal(this.plugin, file, this.field, value)
        if (MultiFileField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.File]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            });
        } else if (MultiFileField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.File]
            });
        };
    }

    public createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new MultiFileModal(this.plugin, file, this.field, value, lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): void {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        const searchBtn = document.createElement("button")
        setIcon(searchBtn, FieldIcon[FieldType.File])
        searchBtn.addClass("metadata-menu-dv-field-button")
        /* end spacer */
        const spacer = document.createElement("div")
        spacer.setAttr("class", "metadata-menu-dv-field-spacer")

        const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        //let fieldModal: SingleFileModal;
        let fieldModal: MultiFileModal;
        if (file instanceof TFile && file.extension == "md") {
            fieldModal = new MultiFileModal(this.plugin, file, this.field, p[this.field.name])
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

    private createFileContainer(parentContainer: HTMLDivElement): void {
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

        const customeRenderingContainer = parentContainer.createDiv();
        customeRenderingContainer.createEl("span", { text: "Alias", cls: 'metadata-menu-field-option' });
        customeRenderingContainer.createEl("span", { text: "Personalise the rendering of your links' aliases with a function returning a string (<page> object is available)", cls: 'metadata-menu-field-option-subtext' });
        customeRenderingContainer.createEl("code", {
            text: `function(page) { return <function using "page">; }`
        })
        const customRendering = new TextAreaComponent(customeRenderingContainer);
        customRendering.inputEl.cols = 50;
        customRendering.inputEl.rows = 4;
        customRendering.setValue(this.field.options.customRendering || "");
        customRendering.setPlaceholder("Javascript string, " +
            "the \"page\" (dataview page type) variable is available\n" +
            "example 1: page.file.name\nexample 2: `${page.file.name} of gender ${page.gender}`")
        customRendering.onChange(value => {
            this.field.options.customRendering = value;
            FieldSettingsModal.removeValidationError(customRendering);
        })

        const customSortingContainer = parentContainer.createDiv();
        customSortingContainer.createEl("span", { text: "Sorting order", cls: 'metadata-menu-field-option' });
        customSortingContainer.createEl("span", { text: "Personalise the sorting order of your links with a instruction taking 2 files (a, b) and returning -1, 0 or 1", cls: 'metadata-menu-field-option-subtext' });
        customSortingContainer.createEl("code", {
            text: `(a: TFile, b: TFile): number`
        })
        const customSorting = new TextAreaComponent(customSortingContainer);
        customSorting.inputEl.cols = 50;
        customSorting.inputEl.rows = 4;
        customSorting.setValue(this.field.options.customSorting || "");
        customSorting.setPlaceholder("Javascript instruction, " +
            "(a: TFile, b: TFile): number\n" +
            "example 1 (alphabetical order): a.basename < b.basename ? 1 : -1 \n" +
            "example 2 (creation time newer to older): b.stat.ctime - b.stat.ctime")
        customSorting.onChange(value => {
            this.field.options.customSorting = value;
            FieldSettingsModal.removeValidationError(customSorting);
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.fileValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createFileContainer(this.fileValidatorField)
        this.fileValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    public getOptionsStr(): string {
        return this.field.options.dvQueryString || "";
    }

    public validateOptions(): boolean {
        return true;
    }

    public validateValue(value: string | { path: string } | { path: string }[]): boolean {
        //todo : manage both raw links and dv Link objects
        return true
    }

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClick: () => {}): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            const dvValue = dvApi.page(file.path)[fieldName]
            const values = Array.isArray(dvValue) ? dvValue : [dvValue]
            values.forEach(value => {
                if (dvApi.value.isLink(value)) {
                    const link = container.createEl('a', { text: value.path.split("/").last().replace(/(.*).md/, "$1") });
                    link.onclick = () => {
                        this.plugin.app.workspace.openLinkText(value.path, file.path, true)
                        onClick()
                    }
                } else {
                    container.createDiv({ text: value });
                }
            })
        }
        container.createDiv()
    }
}