import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent } from "obsidian";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import BooleanField from "src/fields/fieldManagers/BooleanField";
import ObjectListModal from "./ObjectListModal";
import ObjectModal from "./ObjectModal";

export default class BooleanModal extends Modal {
    private value: boolean
    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asComment: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin.app);
        this.value = this.eF ? BooleanField.stringToBoolean(this.eF.value || "") : false;
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        this.buildToggleEl();
    };

    onOpen() {
    };

    onClose(): void {
        this.previousModal?.open()
    }

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
            await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.asList, this.asComment);
            this.close();
        });
    };
};