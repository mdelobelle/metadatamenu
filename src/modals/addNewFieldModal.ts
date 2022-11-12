import { Modal, TextComponent, ButtonComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import { insertValues } from "src/commands/insertValues";

export default class addNewFieldModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private lineNumber: number,
        private file: TFile,
        private inFrontmatter: boolean,
        private after: boolean
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
    }

    onOpen() {
        this.titleEl.setText("Insert new field");
        const nameContainer = this.contentEl.createDiv({ cls: "field-container" });
        nameContainer.createDiv({ text: "Field name: ", cls: "label" });
        const nameInput = new TextComponent(nameContainer);
        nameInput.inputEl.addClass("with-label");
        nameInput.inputEl.addClass("full-width");
        const valueContainer = this.contentEl.createDiv({ cls: "field-container" });
        valueContainer.createDiv({ text: "Field value: ", cls: "label" });
        const valueInput = new TextComponent(valueContainer);
        valueInput.inputEl.addClass("with-label");
        valueInput.inputEl.addClass("full-width");
        const footerButtons = this.contentEl.createDiv({
            cls: 'footer-actions'
        });
        footerButtons.createDiv({ cls: "spacer" });
        const saveButton = new ButtonComponent(footerButtons);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, this.file, nameInput.getValue(), valueInput.getValue(), this.lineNumber, this.inFrontmatter, this.after) });
            this.close()
        });
        const cancelButton = new ButtonComponent(footerButtons);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => {
            this.close();
        });
    };
};