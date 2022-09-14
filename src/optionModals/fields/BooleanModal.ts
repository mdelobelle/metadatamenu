import MetadataMenu from "main";
import { Modal, ToggleComponent, TFile, ButtonComponent } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";

export default class BooleanModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private value: boolean,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
        this.plugin = plugin;
        this.file = file;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontmatter;
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
                await replaceValues(this.plugin, this.file, this.field.name, value);
            } else {
                await insertValues(this.plugin, this.file, this.field.name, value, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        });
    };
};