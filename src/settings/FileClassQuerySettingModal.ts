import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, ExtraButtonComponent, Modal, Setting, TextAreaComponent, TextComponent } from "obsidian";
import { FileClass, getFileClassNameFromPath } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import { cleanActions } from "src/utils/modals";
import FileClassQuerySetting from "./FileClassQuerySetting";

export default class FileClassQuerySettingsModal extends Modal {
    private saved: boolean = false;
    private fileClassQuery: FileClassQuery;
    private initialFileClassQuery: FileClassQuery;
    private new: boolean = true;

    constructor(
        private plugin: MetadataMenu,
        private parentSettingContainer: HTMLElement,
        private parentSetting?: FileClassQuerySetting,
        fileClassQuery?: FileClassQuery
    ) {
        super(plugin.app);
        this.initialFileClassQuery = new FileClassQuery();
        if (fileClassQuery) {
            this.new = false;
            this.fileClassQuery = fileClassQuery;
            FileClassQuery.copyProperty(this.initialFileClassQuery, this.fileClassQuery)
        } else {
            let newId = 1;
            this.plugin.initialFileClassQueries.forEach(prop => {
                if (parseInt(prop.id) && parseInt(prop.id) >= newId) {
                    newId = parseInt(prop.id) + 1;
                };
            });
            this.fileClassQuery = new FileClassQuery();
            this.fileClassQuery.id = newId.toString();
            this.initialFileClassQuery.id = newId.toString();
        };
        this.containerEl.addClass("metadata-menu");
    };

    async onOpen(): Promise<void> {
        if (this.fileClassQuery.name == "") {
            this.titleEl.setText(`Select a fileClass and add an applicable query`);
        } else {
            this.titleEl.setText(`Manage ${this.fileClassQuery.name} settings`);
        };
        await this.createForm();
    };

    onClose(): void {
        Object.assign(this.fileClassQuery, this.initialFileClassQuery);
        if (!this.new && this.parentSetting) {
            this.parentSetting.setTextContentWithname()
        } else if (this.saved) {
            new FileClassQuerySetting(this.parentSettingContainer, this.fileClassQuery, this.plugin);
        };
    };

    private createnameInputContainer(container: HTMLDivElement): TextComponent {
        container.createDiv({ cls: 'label', text: `FileClass Query Name:` });
        const input = new TextComponent(container);
        input.inputEl.addClass("with-label");
        input.inputEl.addClass("full-width");
        const name = this.fileClassQuery.name;
        input.setValue(name);
        input.setPlaceholder("Name of this fileClass query");
        input.onChange(value => {
            this.fileClassQuery.name = value;
            this.titleEl.setText(`Manage options for ${this.fileClassQuery.name}`);
        });
        return input;
    };

    private createFileClassSelectorContainer(container: HTMLDivElement): void {
        container.createDiv({ cls: "label", text: `Fileclass:` });
        container.createDiv({ cls: 'spacer' });
        const select = new DropdownComponent(container);
        const classFilesPath = this.plugin.settings.classFilesPath
        const fileClasses = this.plugin.app.vault
            .getFiles()
            .filter(f => classFilesPath && f.path.startsWith(classFilesPath))
            .reverse();
        select.addOption("--Select a fileClass--", "--Select a fileClass--")
        fileClasses.forEach(fileClass => {
            const fileClassName = getFileClassNameFromPath(this.plugin.settings, fileClass.path);
            if (fileClassName) select.addOption(fileClassName, fileClassName);
        })
        if (this.fileClassQuery.fileClassName) {
            select.setValue(this.fileClassQuery.fileClassName);
        }
        select.onChange(value => {
            if (value != "--Select a fileClass--") {
                this.fileClassQuery.fileClassName = value
            } else {
                this.fileClassQuery.fileClassName = ""
            }
        })
    }

    private createQueryInputContainer(container: HTMLDivElement): void {
        container.createDiv({ text: "dataviewJS query:" });
        const queryStringInputContainer = container.createDiv({ cls: "field-container" })
        const queryStringInput = new TextAreaComponent(queryStringInputContainer);
        queryStringInput.inputEl.addClass("full-width");
        queryStringInput.inputEl.rows = 4
        queryStringInput.setValue(this.fileClassQuery.query);
        queryStringInput.onChange(value => this.fileClassQuery.query = value)
    }

    private async createForm(): Promise<void> {

        /* Sections */
        const nameContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.createnameInputContainer(nameContainer);

        const fileClassSelectContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.createFileClassSelectorContainer(fileClassSelectContainer)

        const fileClassQueryContainer = this.contentEl.createDiv({ cls: "vstacked" });
        this.createQueryInputContainer(fileClassQueryContainer);

        /* footer buttons*/
        cleanActions(this.contentEl, ".footer-actions");
        const footer = this.contentEl.createDiv({ cls: "footer-actions" });
        footer.createDiv({ cls: "spacer" })
        this.createSaveButton(footer);
        this.createCancelButton(footer);

        /* init state */
    };

    private createSaveButton(container: HTMLDivElement): void {
        const b = new ButtonComponent(container)
        b.setTooltip("Save");
        b.setIcon("checkmark");
        b.onClick(async () => {
            if (this.fileClassQuery.fileClassName && this.fileClassQuery.name && this.fileClassQuery.query) {
                this.saved = true;
                const currentExistingFileClassQuery = this.plugin.initialFileClassQueries
                    .filter(p => p.id == this.fileClassQuery.id)[0];
                if (currentExistingFileClassQuery) {
                    FileClassQuery.copyProperty(currentExistingFileClassQuery, this.fileClassQuery);
                } else {
                    this.plugin.initialFileClassQueries.push(this.fileClassQuery);
                };
                FileClassQuery.copyProperty(this.initialFileClassQuery, this.fileClassQuery)
                if (this.parentSetting) FileClassQuery.copyProperty(this.parentSetting.fileClassQuery, this.fileClassQuery);
                this.parentSetting?.setTextContentWithname()
                this.plugin.saveSettings();
                this.close();
            }
        });
    };

    private createCancelButton(container: HTMLDivElement): void {
        const b = new ButtonComponent(container)
        b.setIcon("cross")
            .setTooltip("Cancel")
            .onClick(() => {
                this.saved = false;
                /* reset options from settings */
                if (this.initialFileClassQuery.name != "") {
                    Object.assign(this.fileClassQuery, this.initialFileClassQuery);
                };
                this.close();
            });
    };
};