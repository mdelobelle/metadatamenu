import MetadataMenu from "main"
import { ButtonComponent, Notice, TFile, TextAreaComponent, setIcon } from "obsidian"
import { getExistingFieldForIndexedPath } from "src/fields/ExistingField"
import { ActionLocation, IField, IFieldManager, Target, fieldValueManager, getOptions, isFieldActions, isSuggest, removeValidationError } from "src/fields/Field"
import { getIcon, mapFieldType } from "src/fields/Fields"
import { BaseOptions, IFieldBase } from "src/fields/base/BaseField"
import { IBaseValueModal, basicFuzzySuggestModal } from "src/fields/base/BaseModal"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { Link } from "src/types/dataviewTypes"
import { Constructor } from "src/typings/types"
import { displayLinksOrText } from "src/utils/linksUtils"
import { cleanActions } from "src/utils/modals"

export class Base implements Omit<IFieldBase, 'type' | 'tooltip'> {
    tagName = "file"
    icon = "link"
    colorClass = "file"
}


export interface Options extends BaseOptions {
    dvQueryString?: string
    customRendering?: string
    customSorting?: string
}
export interface DefaultedOptions extends Options { }

export const DefaultOptions: DefaultedOptions = {}


export interface IFieldBaseSettingModal extends ISettingsModal<Options> {
    createCustomSortingContainer: (container: HTMLDivElement) => void
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<IFieldBaseSettingModal> {
    return class SettingModal extends Base {
        createSettingContainer = () => {
            this.createQueryContainer(this.optionsContainer)
            this.createCustomRenderingContainer(this.optionsContainer)
            this.createCustomSortingContainer(this.optionsContainer)
        }

        validateOptions(): boolean {
            return true;
        }

        private createQueryContainer(container: HTMLDivElement): void {
            const dvQueryStringTopContainer = container.createDiv({ cls: "vstacked" });
            dvQueryStringTopContainer.createEl("span", { text: "Dataview Query (optional)", cls: 'field-option' });
            const dvQueryStringContainer = dvQueryStringTopContainer.createDiv({ cls: "field-container" });
            const dvQueryString = new TextAreaComponent(dvQueryStringContainer);
            dvQueryString.inputEl.cols = 50;
            dvQueryString.inputEl.rows = 4;
            dvQueryString.setValue(this.field.options.dvQueryString || "");
            dvQueryString.inputEl.addClass("full-width");
            dvQueryString.onChange(value => {
                this.field.options.dvQueryString = value;
                removeValidationError(dvQueryString);
            })
        }

        public createCustomRenderingContainer(container: HTMLDivElement): void {
            const customRenderingTopContainer = container.createDiv({ cls: "vstacked" })
            customRenderingTopContainer.createEl("span", { text: "Alias" });
            customRenderingTopContainer.createEl("span", { text: "Personalise the rendering of your links' aliases with a function returning a string (<page> object is available)", cls: 'sub-text' });
            customRenderingTopContainer.createEl("code", {
                text: `function(page) { return <function using "page">; }`
            })
            const customeRenderingContainer = customRenderingTopContainer.createDiv({ cls: "field-container" });
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
                removeValidationError(customRendering);
            })
        }

        public createCustomSortingContainer(container: HTMLDivElement): void {
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
                removeValidationError(customSorting);
            })
        }
    }
}

export interface Modal<T extends Target> extends IBaseValueModal<T> {
    inputEl: HTMLInputElement
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = basicFuzzySuggestModal<TFile, Options>(managedField, plugin)
    return class ValueModal extends base {
        public managedField: IFieldManager<Target, Options>
        public addButton: ButtonComponent;
        public saved: boolean
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.managedField.options = getOptions(this.managedField) as DefaultedOptions
            this.containerEl.addClass("metadata-menu");
            const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
            inputContainer.appendChild(this.inputEl)
            this.containerEl.find(".prompt").prepend(inputContainer)
            cleanActions(this.containerEl, ".footer-actions")
            const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        }
        getItems(): TFile[] {
            try {
                if (this.managedField.options.customSorting) {
                    const sortingMethod = (a: TFile, b: TFile) => (new Function("a", "b", `return ${this.managedField.options.customSorting}`))(a, b)
                    return getFiles(this.managedField).sort(sortingMethod);
                } else {
                    const sortingMethod = (a: TFile, b: TFile) => { return a.basename < b.basename ? -1 : 1 }
                    return getFiles(this.managedField).sort(sortingMethod);
                }

            } catch (error) {
                this.close();
                throw (error);
            }
        }
        getItemText(item: TFile): string {
            return item.basename;
        }
        onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void {
            throw new Error("Method not implemented.")
        }
        onClose(): void {
            this.managedField.previousModal?.open()
        }
    }
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    const values = p[managedField.name]
    const buildItem = (_value: Link) => {
        //TODO update with Media and MultiMedia fileds
        /*
        if (_value?.path && [FieldType.Media, FieldType.MultiMedia].includes(managedField.type)) {
            const src = managedField.plugin.app.vault.adapter.getResourcePath(_value.path)
            if (src) {
                const image = fieldContainer.createEl("img")
                image.src = src
                fieldContainer.appendChild(image)
            } else {
                fieldContainer.appendChild(dv.el('span', "?"))
            }
        } else {
            fieldContainer.appendChild(dv.el('span', _value || "", attrs))
        }
        */
        fieldContainer.appendChild(dv.el('span', _value || "", attrs))
    }
    if (Array.isArray(values)) values.forEach(value => buildItem(value))
    else buildItem(values)

    const searchBtn = fieldContainer.createEl("button")
    setIcon(searchBtn, getIcon(managedField.type))
    const spacer = fieldContainer.createEl("div", { cls: "spacer-1" })
    const file = managedField.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
    if (file instanceof TFile && file.extension == "md") {
        searchBtn.onclick = () => managedField.openModal()
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

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    if (managedField.eF) displayLinksOrText(managedField.value, managedField.eF.file, container, managedField.plugin, onClicked)
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    const iconName = getIcon(mapFieldType(field.type));
    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)?.openModal()
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${field.name}`,
            actionLabel: `<span>Update <b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        location.addOption(iconName, action, `Update ${field.name}'s value`);
    };
}

export function getOptionsStr(field: IField<Options>): string {
    return field.options.dvQueryString || "";
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    console.error("Not implemented")
    return false
}

//#region Utilitary function

export function buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string, subPath?: string, alias?: string): string {
    const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
    if (destFile) {
        return plugin.app.fileManager.generateMarkdownLink(
            destFile,
            file.path,
            subPath,
            alias,
        )
    }
    return ""
}

export function convertDataviewArrayOfLinkToArrayOfPath(arr: (Link | any)[]) {
    return arr.reduce((acc, cur) => {
        if (!cur || !cur.path) return acc
        return [...acc, cur.path]
    }, [])
}

export function getFiles(managedField: IField<Options> | IFieldManager<Target, Options>, currentFile?: TFile): TFile[] {
    const options = getOptions(managedField) as DefaultedOptions
    const dvQueryString = options.dvQueryString
    //@ts-ignore
    const getResults = (api: DataviewPlugin["api"]) => {
        try {
            return (new Function("dv", "current", `return ${dvQueryString}`))(api, currentFile ? api.page(currentFile.path) : undefined)
        } catch (error) {
            new Notice(`Wrong query for field <${managedField.name}>\ncheck your settings`, 3000)
        }
    };
    const dataview = managedField.plugin.app.plugins.plugins["dataview"]
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
            return managedField.plugin.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
        } catch (error) {
            throw (error);
        }
    } else {
        return managedField.plugin.app.vault.getMarkdownFiles();
    }
}

//#endregion