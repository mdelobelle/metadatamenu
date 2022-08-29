import { App, Modal, ToggleComponent, TFile, ButtonComponent } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";

export default class BooleanModal extends Modal {

    private file: TFile;
    private value: boolean;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;
    private field: Field;

    constructor(app: App, file: TFile, field: Field, value: boolean, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
        this.field = field
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv({
            cls: "metadata-menu-toggler"
        });
        this.buildToggleEl(inputDiv);
    };

    private buildToggleEl(inputDiv: HTMLDivElement): void {
        const toggleEl = new ToggleComponent(inputDiv);
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        toggleEl.setValue(this.value);
        toggleEl.onChange(value => {
            this.value = value;
            saveButton.buttonEl.focus();
        })
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            const value = this.value.toString()
            if (this.lineNumber == -1) {
                await replaceValues(this.app, this.file, this.field.name, value);
            } else {
                await insertValues(this.app, this.file, this.field.name, value, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        });
    };
};