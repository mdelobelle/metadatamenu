import { Modal, TextComponent, ButtonComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";

export default class addNewFieldModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private lineNumber: number,
        private file: TFile,
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
        cleanActions(this.contentEl, ".footer-actions");
        const footerButtons = this.contentEl.createDiv({
            cls: 'footer-actions'
        });
        footerButtons.createDiv({ cls: "spacer" });
        const saveButton = new ButtonComponent(footerButtons);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            await postValues(this.plugin, [{ id: `new-field-${nameInput.getValue()}`, payload: { value: valueInput.getValue() } }], this.file, this.lineNumber, this.after);
            this.close();
        });
        const cancelButton = new ButtonComponent(footerButtons);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => {
            this.close();
        });
    };
};