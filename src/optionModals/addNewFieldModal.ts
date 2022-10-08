import { Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import { insertValues } from "src/commands/insertValues";

export default class addNewFieldModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private lineNumber: number,
        private file: TFile,
        private inFrontmatter: boolean,
        private after: boolean
    ) { super(plugin.app) }

    onOpen() {
        this.titleEl.setText("Insert new field");
        const addNewFieldContainer = this.contentEl.createDiv();
        const nameInputContainer = addNewFieldContainer.createDiv({ cls: "metadata-menu-prompt-container" });
        nameInputContainer.setText("Field Name: ");
        const nameInputEl = new TextComponent(nameInputContainer);
        nameInputEl.inputEl.addClass("metadata-menu-prompt-input")
        nameInputEl.setPlaceholder("Field name");
        const valueInputContainer = addNewFieldContainer.createDiv({ cls: "metadata-menu-prompt-container" });
        valueInputContainer.setText("Field value: ");
        const valueInputEl = new TextComponent(valueInputContainer);
        valueInputEl.inputEl.addClass("metadata-menu-prompt-input")
        valueInputEl.setPlaceholder("Field value");
        const footerButtons = this.contentEl.createDiv({
            cls: 'metadata-menu-textarea-buttons'
        });
        const saveButton = new ButtonComponent(footerButtons);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, this.file, nameInputEl.getValue(), valueInputEl.getValue(), this.lineNumber, this.inFrontmatter, this.after) });
            this.close()
        });
        const cancelButton = new ExtraButtonComponent(footerButtons);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => {
            this.close();
        });


    };
};