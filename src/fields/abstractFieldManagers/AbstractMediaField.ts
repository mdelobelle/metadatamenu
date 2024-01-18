import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, TFile, TextComponent, ToggleComponent } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import AbstractFileBasedField from "./AbstractFileBasedField";
import { getLink } from "src/utils/parser";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import MediaFileModal from "src/modals/fields/MediaFileModal";
import { SettingLocation } from "../FieldManager";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FolderSuggest } from "src/suggester/FolderSuggester";
import { MultiMediaFileModal } from "src/modals/fields/MultiMediaFileModal";

export const filesDisplay = {
    "list": "list",
    "card": "card"
}

export abstract class AbstractMediaField extends AbstractFileBasedField<MediaFileModal | MultiMediaFileModal> {

    public foldersInputComponents: Array<TextComponent> = []

    constructor(plugin: MetadataMenu, field: Field, fieldType: FieldType.Media | FieldType.MultiMedia) {
        super(plugin, field, fieldType)
        this.field.options.folders = this.field.options.folders || []
    }

    abstract modalFactory(
        plugin: MetadataMenu,
        file: TFile,
        field: Field,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): MediaFileModal | MultiMediaFileModal

    public getFiles = (): TFile[] => {
        const folders = this.field.options.folders as string[]
        const files = this.plugin.app.vault.getFiles()
            .filter(f => !folders?.length || folders.some(folder => f.path.startsWith(folder)))
            .filter(f => !["md", "canvas"].includes(f.extension))
        return files
    }

    static buildLink(plugin: MetadataMenu, sourceFile: TFile, destPath: string, thumbnailSize: string | undefined) {
        const destFile = plugin.app.vault.getAbstractFileByPath(destPath)
        if (destFile instanceof TFile) {
            const link = plugin.app.fileManager.generateMarkdownLink(destFile, sourceFile.path, undefined, thumbnailSize)
            return link
        }
        return ""
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked: () => {}): void {
        const link = getLink(value, file)
        if (link?.path) {
            const linkText = link.path.split("/").last() || ""
            const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
            linkEl.onclick = () => {
                this.plugin.app.workspace.openLinkText(link.path, file.path, true)
                onClicked();
            }
        } else {
            container.createDiv({ text: value });
        }
        container.createDiv();
    }

    public createFoldersPathContainer(container: HTMLDivElement) {

    }

    public createAddButton(valuesListHeader: HTMLDivElement, valuesListBody: HTMLDivElement): void {
        valuesListHeader.createDiv({ cls: "label", text: "Add a folder containing media files" })
        valuesListHeader.createDiv({ cls: "spacer" })
        const addValue = valuesListHeader.createEl('button');
        addValue.type = 'button';
        addValue.textContent = 'Add a value';
        addValue.onClickEvent(async (evt: MouseEvent) => {
            evt.preventDefault();
            const newKeyNumber = (this.field.options.folders || []).length + 1;
            this.field.options.folders[newKeyNumber] = "";
            this.foldersInputComponents.push(this.createFolderContainer(valuesListBody, newKeyNumber))
        });
    }

    public createFolderContainer(parentNode: HTMLDivElement, key: number): TextComponent {
        const values = this.field.options.folders || {};
        const presetFolder = values[key];
        const valueContainer = parentNode.createDiv({ cls: 'field-container', });
        const input = new TextComponent(valueContainer);
        input.inputEl.addClass("full-width");
        input.setValue(presetFolder);
        input.onChange(value => {
            this.field.options.folders[key] = value;
            FieldSettingsModal.removeValidationError(input);
        });
        new FolderSuggest(
            this.plugin,
            input.inputEl
        )
        const valueRemoveButton = new ButtonComponent(valueContainer);
        valueRemoveButton.setIcon("trash")
            .onClick((evt: MouseEvent) => {
                evt.preventDefault();
                FieldSettingsModal.removeValidationError(input);
                this.field.options.folders = this.field.options.folders.filter((f: string) => f !== input.getValue()).filter((f: string | null) => !!f)
                parentNode.removeChild(valueContainer);
                this.foldersInputComponents.remove(input);
            });
        return input;
    };

    public createFoldersListContainer(parentContainer: HTMLDivElement): HTMLDivElement {
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

    public createEmbedTogglerContainer(container: HTMLDivElement) {
        const togglerContainer = container.createDiv({ cls: "field-container" })
        togglerContainer.createDiv({ cls: "label", text: "Inline thumbnail embedded" })
        togglerContainer.createDiv({ cls: "spacer" })
        new ToggleComponent(togglerContainer)
            .setValue(this.field.options.embed)
            .onChange((value) => this.field.options.embed = value)
    }

    public createFilesDisplaySelectorContainer(container: HTMLDivElement) {
        const filesDisplaySelectorContainer = container.createDiv({ cls: "field-container" })
        filesDisplaySelectorContainer.createDiv({ cls: "label", text: "File suggest modal display" })
        filesDisplaySelectorContainer.createDiv({ cls: "spacer" })
        new DropdownComponent(filesDisplaySelectorContainer)
            .addOptions(filesDisplay)
            .setValue(this.field.options.display || "list")
            .onChange((value) => this.field.options.display = value)
    }

    public createThumbnailSizeInputContainer(container: HTMLDivElement) {
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

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation | undefined): void {
        this.createFoldersListContainer(container)
        this.createEmbedTogglerContainer(container)
        this.createFilesDisplaySelectorContainer(container)
        this.createThumbnailSizeInputContainer(container)
        super.createCustomSortingContainer(container)
    }
}
