import MetadataMenu from "main";
import { Menu, Notice, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import MultiFileModal from "src/modals/fields/MultiFileModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import { FieldOptions } from "src/components/NoteFields";

export default class MultiFileField extends FieldManager {

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

    public addFieldOption(name: string, value: any, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const modal = new MultiFileModal(this.plugin, file, this.field, value)
        const action = () => modal.open()
        if (MultiFileField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.File]);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            });
        } else if (MultiFileField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.File]
            });
        } else if (MultiFileField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.File], action, `Update ${name}'s value`);
        };
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        value?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean)
        : void {
        const fieldModal = new MultiFileModal(this.plugin, file, this.field, value, lineNumber, after, asList, asComment);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = "value-container"
        fieldContainer.appendChild(dv.el('span', p[this.field.name], attrs))

        const searchBtn = fieldContainer.createEl("button")
        setIcon(searchBtn, FieldIcon[FieldType.File])
        const spacer = fieldContainer.createEl("div", { cls: "spacer" })

        const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
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
    }

    private createFileContainer(container: HTMLDivElement): void {
        const dvQueryStringTopContainer = container.createDiv({ cls: "vstacked" });
        dvQueryStringTopContainer.createEl("span", { text: "Dataview Query (optional)", cls: 'field-option' });
        const dvQueryStringContainer = dvQueryStringTopContainer.createDiv({ cls: "field-container" });
        this.dvQueryString = new TextAreaComponent(dvQueryStringContainer);
        this.dvQueryString.inputEl.cols = 50;
        this.dvQueryString.inputEl.rows = 4;
        this.dvQueryString.setValue(this.field.options.dvQueryString || "");
        this.dvQueryString.inputEl.addClass("full-width");
        this.dvQueryString.onChange(value => {
            this.field.options.dvQueryString = value;
            FieldSettingsModal.removeValidationError(this.dvQueryString);
        })


        const customeRenderingTopContainer = container.createDiv({ cls: "vstacked" })
        customeRenderingTopContainer.createEl("span", { text: "Alias" });
        customeRenderingTopContainer.createEl("span", { text: "Personalise the rendering of your links' aliases with a function returning a string (<page> object is available)", cls: 'sub-text' });
        customeRenderingTopContainer.createEl("code", {
            text: `function(page) { return <function using "page">; }`
        })
        const customeRenderingContainer = customeRenderingTopContainer.createDiv({ cls: "field-container" });
        const customRendering = new TextAreaComponent(customeRenderingContainer);
        customRendering.inputEl.cols = 50;
        customRendering.inputEl.rows = 4;
        customRendering.inputEl.addClass("full-width");
        customRendering.setValue(this.field.options.customRendering || "");
        customRendering.setPlaceholder("Javascript string, " +
            "the \"page\" (dataview page type) variable is available\n" +
            "example 1: page.file.name\nexample 2: `${page.file.name} of gender ${page.gender}`")
        customRendering.onChange(value => {
            this.field.options.customRendering = value;
            FieldSettingsModal.removeValidationError(customRendering);
        })

        const customSortingTopContainer = container.createDiv({ cls: "vstacked" });
        customSortingTopContainer.createEl("span", { text: "Sorting order" });
        customSortingTopContainer.createEl("span", { text: "Personalise the sorting order of your links with a instruction taking 2 files (a, b) and returning -1, 0 or 1", cls: 'sub-text' });
        customSortingTopContainer.createEl("code", {
            text: `(a: TFile, b: TFile): number`
        })
        const customSortingContainer = customSortingTopContainer.createDiv({ cls: "field-container" })
        const customSorting = new TextAreaComponent(customSortingContainer);
        customSorting.inputEl.cols = 50;
        customSorting.inputEl.rows = 4;
        customSorting.inputEl.addClass("full-width");
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
        this.createFileContainer(parentContainer)
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
            values.forEach((value, i) => {
                if (dvApi.value.isLink(value)) {
                    const link = container.createEl('a', { text: value.path.split("/").last().replace(/(.*).md/, "$1") });
                    link.onclick = () => {
                        this.plugin.app.workspace.openLinkText(value.path, file.path, true)
                        onClick()
                    }
                } else {
                    container.createDiv({ text: value });
                }
                if (i < values.length - 1) {
                    container.createEl('span', { text: " | " })
                }
            })
        }
        container.createDiv()
    }
}