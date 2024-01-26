import MetadataMenu from "main"
import { ButtonComponent, DropdownComponent, FuzzyMatch, FuzzySuggestModal, TFile, TextAreaComponent, TextComponent, ToggleComponent, setIcon } from "obsidian"
import { ActionLocation, IFieldManager, LegacyField, Target, removeValidationError } from "src/fields/Field"
import { BaseOptions, IFieldBase } from "src/fields/base/BaseField"
import { BaseValueModal, IBaseValueModal, basicFuzzySuggestModal } from "src/fields/base/BaseModal"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { FolderSuggest } from "src/suggester/FolderSuggester"
import { Constructor } from "src/typings/types"
import { createDvField as _createDvField, Options as FileOptions, actions as fileActions } from "./AbstractFile"
import { getLink } from "src/utils/parser"

//#region types

export enum MediaType {
    Audio = "Audio",
    Image = "Image",
    Video = "Video"
}

export const extensionMediaTypes: Record<string, MediaType> = {
    avif: MediaType.Image,
    bmp: MediaType.Image,
    gif: MediaType.Image,
    jpg: MediaType.Image,
    jpeg: MediaType.Image,
    png: MediaType.Image,
    svg: MediaType.Image,
    tif: MediaType.Image,
    tiff: MediaType.Image,
    webp: MediaType.Image,
}

export type DisplayType = "list" | "card"

export const commonMediaTypeIcon = (display: DisplayType) => `<svg xmlns="http://www.w3.org/2000/svg" ${display === 'card' ? 'width="164" height="164"' : 'width="40" height="40"'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-question">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"/>
</svg>`


export const filesDisplay = {
    "list": "list",
    "card": "card"
}

export class Base implements Omit<IFieldBase, 'type' | 'tooltip'> {
    tagName = "file"
    icon = "paperclip"
    colorClass = "file"
}

//#endregion


export interface Options extends FileOptions {
    embed: boolean
    folders: string[]
    display: DisplayType
    thumbnailSize: string
}

export const DefaultOptions: Options = {
    embed: false,
    folders: [],
    display: "card",
    thumbnailSize: "100"
}

export interface DefaultedOptions extends Options { }

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    return class SettingModal extends Base {
        public foldersInputComponents: Array<TextComponent> = []

        createSettingContainer = () => {
            const container = this.optionsContainer

            this.createFoldersListContainer(container)
            this.createEmbedTogglerContainer(container)
            this.createFilesDisplaySelectorContainer(container)
            this.createThumbnailSizeInputContainer(container)
            this.createCustomSortingContainer(container)
        }

        validateOptions(): boolean {
            return true;
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
                (this.field.options as Options).customSorting = value;
                removeValidationError(customSorting);
            })
        }

        public createAddButton(valuesListHeader: HTMLDivElement, valuesListBody: HTMLDivElement): void {
            valuesListHeader.createDiv({ cls: "label", text: "Add a folder containing media files" })
            valuesListHeader.createDiv({ cls: "spacer" })
            const addValue = valuesListHeader.createEl('button');
            addValue.type = 'button';
            addValue.textContent = 'Add a value';
            addValue.onClickEvent(async (evt: MouseEvent) => {
                evt.preventDefault();
                //FIXME doesn't work at field init
                const newKeyNumber = (this.field.options.folders || []).length + 1;
                this.field.options.folders[newKeyNumber] = "";
                this.foldersInputComponents.push(this.createFolderContainer(valuesListBody, newKeyNumber))
            });
        }

        private createFolderContainer(parentNode: HTMLDivElement, key: number): TextComponent {
            const values = this.field.options.folders || {};
            const presetFolder = values[key];
            const valueContainer = parentNode.createDiv({ cls: 'field-container', });
            const input = new TextComponent(valueContainer);
            input.inputEl.addClass("full-width");
            input.setValue(presetFolder);
            input.onChange(value => {
                this.field.options.folders[key] = value;
                removeValidationError(input);
            });
            new FolderSuggest(
                this.plugin,
                input.inputEl
            )
            const valueRemoveButton = new ButtonComponent(valueContainer);
            valueRemoveButton.setIcon("trash")
                .onClick((evt: MouseEvent) => {
                    evt.preventDefault();
                    removeValidationError(input);
                    this.field.options.folders = this.field.options.folders.filter((f: string) => f !== input.getValue()).filter((f: string | null) => !!f)
                    parentNode.removeChild(valueContainer);
                    this.foldersInputComponents.remove(input);
                });
            return input;
        };

        private createFoldersListContainer(parentContainer: HTMLDivElement): HTMLDivElement {
            const valuesListHeader = parentContainer.createDiv({ cls: "field-container" });
            const presetFoldersFields = parentContainer.createDiv()
            const foldersList = presetFoldersFields.createDiv();
            const foldersListContainer = foldersList.createDiv();
            this.createAddButton(valuesListHeader, foldersListContainer)
            this.field.options.folders?.forEach((folder: string, index: number) => {
                this.foldersInputComponents.push(this.createFolderContainer(foldersListContainer, index));
            });
            return presetFoldersFields;
        }

        private createEmbedTogglerContainer(container: HTMLDivElement) {
            const togglerContainer = container.createDiv({ cls: "field-container" })
            togglerContainer.createDiv({ cls: "label", text: "Inline thumbnail embedded" })
            togglerContainer.createDiv({ cls: "spacer" })
            new ToggleComponent(togglerContainer)
                .setValue(this.field.options.embed)
                .onChange((value) => this.field.options.embed = value)
        }

        private createFilesDisplaySelectorContainer(container: HTMLDivElement) {
            const filesDisplaySelectorContainer = container.createDiv({ cls: "field-container" })
            filesDisplaySelectorContainer.createDiv({ cls: "label", text: "File suggest modal display" })
            filesDisplaySelectorContainer.createDiv({ cls: "spacer" })
            new DropdownComponent(filesDisplaySelectorContainer)
                .addOptions(filesDisplay)
                .setValue(this.field.options.display || "list")
                .onChange((value: DisplayType) => this.field.options.display = value)
        }

        private createThumbnailSizeInputContainer(container: HTMLDivElement) {
            const thumbnailSizeInputContainer = container.createDiv({ cls: "field-container" })
            thumbnailSizeInputContainer.createDiv({ cls: "label", text: "Inline embedded thumbnail height (px): " })
            thumbnailSizeInputContainer.createDiv({ cls: "spacer" })
            new TextComponent(thumbnailSizeInputContainer)
                .setValue(this.field.options.thumbnailSize)
                .onChange((value) => {
                    if (!value) this.field.options.thumbnailSize = ""
                    else if (isNaN(parseInt(value))) this.field.options.thumbnailSize = "20"
                    else this.field.options.thumbnailSize = value
                })
        }
    }
}

export interface Modal<T extends Target> extends IBaseValueModal<T> {
    selectedFiles: TFile[]
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = basicFuzzySuggestModal<TFile, Options>(managedField, plugin)
    return class ValueModal extends base {
        public selectedFiles: TFile[] = []
        public managedField: IFieldManager<Target, Options>
        public addButton: ButtonComponent;
        public previousModal?: BaseValueModal<Target, BaseOptions>
        public saved: boolean
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.containerEl.addClass("metadata-menu")
            this.containerEl
                .querySelector(".prompt")?.addClass(
                    managedField.options.display === "card"
                        ? "media-as-cards"
                        : "media-as-list"
                )
        }

        getFiles = (): TFile[] => {
            const folders = managedField.options.folders as string[]
            const files = managedField.plugin.app.vault.getFiles()
                .filter(f => !folders?.length || folders.some(folder => f.path.startsWith(folder)))
                .filter(f => !["md", "canvas"].includes(f.extension))
            return files
        }

        getItems(): TFile[] {
            const sortingMethod = (new Function("a", "b", `return ${managedField.options.customSorting}`) || function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }) as ((a: TFile, b: TFile) => number)
            try {
                return this.getFiles().sort(sortingMethod);
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
            this.previousModal?.open()
        }

        renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
            el.addClass("value-container")
            const isImage = extensionMediaTypes[value.item.extension] === MediaType.Image
            const suggestionContainer = el.createDiv({ cls: "media-item" });
            const thumbnailContainer = suggestionContainer.createDiv({ cls: "thumbnail-container" })
            if (isImage) {
                const image = thumbnailContainer.createEl("img", { cls: "thumbnail" })
                const src = plugin.app.vault.adapter.getResourcePath(value.item.path)
                if (managedField.options.display === "list") {
                    thumbnailContainer.style.width = "40px"
                }
                image.src = src
            } else {
                thumbnailContainer.innerHTML = commonMediaTypeIcon(managedField.options.display)
            }

            const mediaInfoContainer = suggestionContainer.createDiv({ cls: "media-info-container" })
            mediaInfoContainer.createDiv({ text: value.item.extension, cls: "chip media-type-container" })
            if (this.selectedFiles.some(f => f.path === value.item.path)) {
                el.addClass("value-checked")
                const iconContainer = mediaInfoContainer.createDiv({ cls: "icon-container" })
                setIcon(iconContainer, "check-circle")
            }
            this.inputEl.focus()
            const fileName = `${value.item.basename.slice(0, 20).padEnd(value.item.basename.length > 20 ? 23 : 0, '.')}.${value.item.extension}`
            suggestionContainer.createDiv({ cls: "file-name", text: fileName })
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
    return _createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any): void {
    const eF = managedField.eF
    if (!eF) return
    const link = getLink(eF.value, eF.file)
    if (link?.path) {
        const linkText = link.path.split("/").last() || ""
        const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
        linkEl.onclick = () => {
            this.plugin.app.workspace.openLinkText(link.path, eF.file.path, true)
            onClicked();
        }
    } else {
        container.createDiv({ text: eF.value });
    }
    container.createDiv();
}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return fileActions(plugin, field, file, location, indexedPath)
}

export function getOptionsStr(managedField: IFieldManager<Target, Options>): string {
    const options = managedField.options
    return `${options.display} | ${options.embed} | ${options.size} | ${options.folders.join(", ")}`
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    console.error("Not implemented")
    return false
}

//#region Media utils

export function buildMediaLink(plugin: MetadataMenu, sourceFile: TFile, destPath: string, thumbnailSize: string | undefined) {
    const destFile = plugin.app.vault.getAbstractFileByPath(destPath)
    if (destFile instanceof TFile) {
        const link = plugin.app.fileManager.generateMarkdownLink(destFile, sourceFile.path, undefined, thumbnailSize)
        return link
    }
    return ""
}

export function getFiles(managedField: IFieldManager<Target, Options>): TFile[] {
    const folders = managedField.options.folders as string[]
    const files = managedField.plugin.app.vault.getFiles()
        .filter(f => !folders?.length || folders.some(folder => f.path.startsWith(folder)))
        .filter(f => !["md", "canvas"].includes(f.extension))
    return files
}

//#endregion