import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";

export default class BooleanModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private value: boolean,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
    ) {
        super(plugin.app);
        this.plugin = plugin;
        this.file = file;
        this.value = value;
        this.lineNumber = lineNumber;
        this.after = after;
        this.asList = asList;
        this.asComment = asComment;
        this.field = field
    };

    onOpen() {
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        this.buildToggleEl();
    };


    private buildToggleEl(): void {
        const choicesContainer = this.contentEl.createDiv({ cls: "value-container" })
        choicesContainer.createDiv({ cls: "spacer" });
        const trueButton = new ButtonComponent(choicesContainer);
        trueButton.setButtonText("True")
        trueButton.setClass("left")
        choicesContainer.createDiv({ cls: "spacer" });
        const falseButton = new ButtonComponent(choicesContainer);
        falseButton.setButtonText("False")
        choicesContainer.createDiv({ cls: "spacer" });
        if (this.value) {
            trueButton.setCta();
            falseButton.removeCta();
        } else {
            falseButton.setCta();
            trueButton.removeCta();
        }
        falseButton.onClick(() => {
            this.value = false;
            falseButton.setCta();
            trueButton.removeCta();
        })
        trueButton.onClick(() => {
            this.value = true;
            trueButton.setCta();
            falseButton.removeCta();
        })
        const saveButton = new ButtonComponent(choicesContainer);
        saveButton.setClass("right")
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            const value = this.value.toString()
            await postValues(this.plugin, [{ id: this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.after, this.asList, this.asComment);
            this.close();
        });
    };
};