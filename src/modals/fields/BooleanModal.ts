import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent } from "obsidian";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import BooleanField from "src/fields/fieldManagers/BooleanField";
import BaseModal from "../baseModal";
import ObjectListModal from "./ObjectListModal";
import ObjectModal from "./ObjectModal";

export default class BooleanModal extends BaseModal {
    private value: boolean
    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        private field: Field,
        private eF?: ExistingField,
        public indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin, file, previousModal, indexedPath);
        this.value = this.eF ? BooleanField.stringToBoolean(this.eF.value || "") : false;
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
        this.buildSimpleSaveBtn(choicesContainer)
    };

    public async save(e: Event | undefined): Promise<void> {
        const value = this.value.toString()
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
        this.saved = true
        if (this.previousModal) await this.goToPreviousModal()
        this.close();
    }
};