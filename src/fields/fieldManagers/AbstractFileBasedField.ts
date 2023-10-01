import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import { TextAreaComponent, TFile, Notice, setIcon, Menu, Modal } from "obsidian";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import MetadataMenu from "main";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { FieldOptions } from "src/components/NoteFields";
import { Link } from "src/types/dataviewTypes";
import { Note } from "src/note/note";


const convertDataviewArrayOfLinkToArrayOfPath = (arr: (Link | any)[]) => {
    return arr.reduce((acc, cur) => {
        if (!cur || !cur.path) return acc
        return [...acc, cur.path]
    }, [])
}

export const getFiles = (plugin: MetadataMenu, field: Field, dvQueryString: string, currentFile?: TFile): TFile[] => {
    //@ts-ignore
    const getResults = (api: DataviewPlugin["api"]) => {
        try {
            return (new Function("dv", "current", `return ${dvQueryString}`))(api, api.page(currentFile?.path))
        } catch (error) {
            new Notice(`Wrong query for field <${field.name}>\ncheck your settings`, 3000)
        }
    };
    const dataview = plugin.app.plugins.plugins["dataview"]
    //@ts-ignore
    if (dvQueryString && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
        try {
            let results = getResults(dataview.api);
            if (!results) return []

            if (Array.isArray(results.values)) {
                // .values in this context is not the function of the Array prototype
                // but the property of the DataArrayImpl proxy target returned by a dataview function
                results = results.values
            }
            const filesPath = results.reduce((a: any[], v?: any) => {
                if (!v) return a

                // v is a Link
                if (v.path) return [...a, v.path]

                // v is a TFile
                if (v.file) return [...a, v.file.path]

                if (Array.isArray(v)) return [...a, ...convertDataviewArrayOfLinkToArrayOfPath(v)]

                return a
            }, [])
            return plugin.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
        } catch (error) {
            throw (error);
        }
    } else {
        return plugin.app.vault.getMarkdownFiles();
    }
}


export default abstract class AbstractFileBasedField<T extends Modal> extends FieldManager {

    public dvQueryString: TextAreaComponent
    abstract modalFactory(...args: any): T

    constructor(plugin: MetadataMenu, field: Field, type: FieldType) {
        super(plugin, field, type)
    }
    public getFiles = (currentFile?: TFile): TFile[] => getFiles(this.plugin, this.field, this.field.options.dvQueryString, currentFile)

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const note = new Note(this.plugin, file)
        await note.build()
        const modal = this.modalFactory(this.plugin, file, this.field, note, indexedPath)
        modal.open()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const action = async () => await this.buildAndOpenModal(file, indexedPath)
        if (AbstractFileBasedField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${this.field.name}>`);
                item.setIcon(FieldIcon[FieldType.File]);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            });
        } else if (AbstractFileBasedField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.File]
            });
        } else if (AbstractFileBasedField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.File], action, `Update ${name}'s value`);
        };
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

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        note?: Note,
        indexedPath?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = this.modalFactory(this.plugin, file, this.field, note, indexedPath, lineNumber, after, asList, asComment)
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
        if (file instanceof TFile && file.extension == "md") {
            searchBtn.onclick = async () => await this.buildAndOpenModal(file)
        } else {
            searchBtn.onclick = async () => { }
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
}

