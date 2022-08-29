import { Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import { insertValues } from "src/commands/insertValues";

export default class addNewFieldModal extends Modal {

    private lineNumber: number;
    private file: TFile;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(plugin: MetadataMenu, lineNumber: number, file: TFile, inFrontmatter: boolean, after: boolean) {
        super(plugin.app);
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontmatter;
        this.file = file;
        this.after = after;
    }

    onOpen() {
        this.titleEl.setText("Insert new field");
        const addNewFieldContainer = this.contentEl.createDiv();
        const nameInputContainer = addNewFieldContainer.createDiv();
        nameInputContainer.setText("Field Name: ");
        const nameInputEl = new TextComponent(nameInputContainer);
        nameInputEl.setPlaceholder("Field name");
        const valueInputContainer = addNewFieldContainer.createDiv();
        valueInputContainer.setText("Field value: ");
        const valueInputEl = new TextComponent(valueInputContainer);
        valueInputEl.setPlaceholder("Field value");
        const footerButtons = this.contentEl.createDiv({
            cls: 'metadata-menu-textarea-buttons'
        });
        const saveButton = new ButtonComponent(footerButtons);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            await insertValues(this.app, this.file, nameInputEl.getValue(), valueInputEl.getValue(), this.lineNumber, this.inFrontmatter, this.after);
            this.close()
        });
        const cancelButton = new ExtraButtonComponent(footerButtons);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => {
            this.close();
        });


    };
};