import MetadataMenu from "main";
import { TextComponent, TFile, ButtonComponent } from "obsidian";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/_Field";
import NumberField from "src/fields/fieldManagers/NumberField";
import { FieldManager } from "src/types/fieldTypes";
import { cleanActions } from "src/utils/modals";
import BaseModal from "../baseFieldModals/BaseModal";
import ObjectListModal from "./ObjectListModal";
import ObjectModal from "./ObjectModal";

export default class NumberModal extends BaseModal {

    private fieldManager: NumberField;
    private numberInput: TextComponent;
    private errorField: HTMLDivElement;
    private value: string;

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
        this.value = this.eF?.value || ""
        this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field)
        this.containerEl.addClass("metadata-menu")
        this.buildInputEl();
    };

    onOpen() {
        super.onOpen()
    };

    private decrement(numberInput: TextComponent): void {
        const { step } = this.field.options;
        const fStep = parseFloat(step);
        const fValue = parseFloat(numberInput.getValue()) || 0
        if (!isNaN(fStep)) {
            numberInput.setValue((fValue - fStep).toString());
        } else {
            numberInput.setValue((fValue - 1).toString());
        }
    }

    private increment(numberInput: TextComponent): void {
        const { step } = this.field.options
        const fStep = parseFloat(step)
        const fValue = parseFloat(numberInput.getValue()) || 0
        if (!isNaN(fStep)) {
            numberInput.setValue((fValue + fStep).toString());
        } else {
            numberInput.setValue((fValue + 1).toString());
        }
    }

    private toggleButtonsState(minusBtn: ButtonComponent, plusBtn: ButtonComponent, numberInput: TextComponent): void {
        minusBtn.setDisabled(!this.fieldManager.canDecrement(numberInput.getValue()));
        plusBtn.setDisabled(!this.fieldManager.canIncrement(numberInput.getValue()));
        if (this.fieldManager.canDecrement(numberInput.getValue())) {
            minusBtn.setCta();
        } else {
            minusBtn.removeCta();
        }
        if (this.fieldManager.canIncrement(numberInput.getValue())) {
            plusBtn.setCta();
        } else {
            plusBtn.removeCta();
        }
    }

    private buildInputEl(): void {
        const { step } = this.field.options
        cleanActions(this.contentEl, ".field-container")
        const fieldContainer = this.contentEl.createEl("div", { cls: "field-container" })

        this.numberInput = new TextComponent(fieldContainer);
        const numberInput = this.numberInput
        numberInput.inputEl.focus();
        numberInput.setValue(`${this.value || ""}`);

        const minusBtn = new ButtonComponent(fieldContainer);
        minusBtn.setButtonText(`- ${!!step ? step : 1}`);
        minusBtn.setDisabled(!this.fieldManager.canDecrement(numberInput.getValue()));

        const plusBtn = new ButtonComponent(fieldContainer);
        plusBtn.setButtonText(`+ ${!!step ? step : 1}`);
        plusBtn.setDisabled(!this.fieldManager.canIncrement(numberInput.getValue()));

        fieldContainer.createDiv({ cls: "spacer" })

        this.buildSimpleSaveBtn(fieldContainer)

        cleanActions(this.contentEl, ".field-error")
        this.errorField = this.contentEl.createEl("div", { cls: "field-error" })
        this.errorField.hide()

        this.toggleButtonsState(minusBtn, plusBtn, numberInput);

        //event handlers
        numberInput.onChange(() => {
            numberInput.inputEl.removeClass("is-invalid")
            this.errorField.hide();
            this.errorField.setText("");
            this.toggleButtonsState(minusBtn, plusBtn, numberInput)
        })

        plusBtn.onClick((e) => {
            e.preventDefault();
            this.increment(numberInput);
            this.toggleButtonsState(minusBtn, plusBtn, numberInput);
        })

        minusBtn.onClick((e) => {
            e.preventDefault();
            this.decrement(numberInput);
            this.toggleButtonsState(minusBtn, plusBtn, numberInput);
        })
    };

    public async save(): Promise<void> {
        const inputValue = this.numberInput.getValue();

        if (!this.fieldManager.validateValue(inputValue)) {
            const { min, max } = this.field.options
            this.errorField.show();
            this.errorField.setText(`value must be numeric${min ? " and >= " + min : ""} ${max ? " and <= " + max : ""}`)
            this.numberInput.inputEl.setAttr("class", "is-invalid")
            return
        }
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: inputValue } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
        this.saved = true
        if (this.previousModal) await this.goToPreviousModal()
        this.close()
    }
};