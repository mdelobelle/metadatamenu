import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, ExtraButtonComponent, Modal, Setting, TextAreaComponent, TextComponent } from "obsidian";
import FileClassQuery from "src/fileClass/FileClassQuery";
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

    private createnameInputContainer(parentNode: HTMLDivElement): TextComponent {
        const fileClassQueryNameContainerLabel = parentNode.createDiv();
        fileClassQueryNameContainerLabel.setText(`FileClass Query Name:`);
        const input = new TextComponent(parentNode);
        const name = this.fileClassQuery.name;
        input.setValue(name);
        input.setPlaceholder("Name of this fileClass query");
        input.onChange(value => {
            this.fileClassQuery.name = value;
            this.titleEl.setText(`Manage options for ${this.fileClassQuery.name}`);
        });
        return input;
    };

    private createFileClassSelectorContainer(parentNode: HTMLDivElement): void {
        const FileClassSelectorContainerLabel = parentNode.createDiv();
        FileClassSelectorContainerLabel.setText(`Fileclass:`);
        const select = new DropdownComponent(parentNode);
        const fileClasses = this.plugin.app.vault.getFiles().filter(f => f.path.startsWith(this.plugin.settings.classFilesPath))
        select.addOption("--Select a fileClass--", "--Select a fileClass--")
        fileClasses.forEach(fileClass => select.addOption(fileClass.basename, fileClass.basename))
        if (this.fileClassQuery.fileClassName) {
            select.setValue(this.fileClassQuery.fileClassName)
        }
        select.onChange(value => {
            if (value != "--Select a fileClass--") {
                this.fileClassQuery.fileClassName = value
            } else {
                this.fileClassQuery.fileClassName = ""
            }
        })
    }

    private createQueryInputContainer(parentNode: HTMLDivElement): void {
        const queryContainerLabel = parentNode.createDiv();
        queryContainerLabel.setText("dataviewJS query:")
        const queryStringInput = new TextAreaComponent(parentNode);
        queryStringInput.setValue(this.fileClassQuery.query);
        queryStringInput.onChange(value => this.fileClassQuery.query = value)
    }

    private async createForm(): Promise<void> {
        const div = this.contentEl.createDiv({ cls: "metadata-menu-prompt-div" });
        const mainDiv = div.createDiv({ cls: "metadata-menu-prompt-form" });

        /* Sections */
        const nameContainer = mainDiv.createDiv();
        this.createnameInputContainer(nameContainer);
        mainDiv.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        const fileClassSelectContainer = mainDiv.createDiv()

        /* footer buttons*/
        const footerEl = this.contentEl.createDiv();
        const footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => this.createSaveButton(b));
        footerButtons.addExtraButton((b) => this.createCancelButton(b));

        /* init state */
        this.createFileClassSelectorContainer(fileClassSelectContainer)
        const fileClassQueryContainer = mainDiv.createDiv();
        this.createQueryInputContainer(fileClassQueryContainer);
    };

    private createSaveButton(b: ButtonComponent): ButtonComponent {
        b.setTooltip("Save");
        b.setIcon("checkmark");
        b.onClick(async () => {
            if (this.fileClassQuery.fileClassName && this.fileClassQuery.name && this.fileClassQuery.query) {
                this.saved = true;
                const currentExistingFileClassQuery = this.plugin.initialFileClassQueries.filter(p => p.id == this.fileClassQuery.id)[0];
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
        return b;
    };

    private createCancelButton(b: ExtraButtonComponent): ExtraButtonComponent {
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
        return b;
    };
};