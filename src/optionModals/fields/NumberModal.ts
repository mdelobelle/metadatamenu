import { App, Modal, TextComponent, TFile, ButtonComponent, MarkdownEditView, MarkdownView } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";
import NumberField from "src/fields/fieldManagers/NumberField";
import { FieldManager } from "src/types/fieldTypes";

export default class NumbertModal extends Modal {

    private file: TFile;
    private value: string;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;
    private field: Field;
    private fieldManager: NumberField;

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
        this.fieldManager = new FieldManager[this.field.type](this.field)
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv();
        this.buildInputEl(inputDiv);
    };

    private decrement(inputEl: TextComponent): void {
        const { step } = this.field.options;
        const fStep = parseFloat(step);
        if (!isNaN(fStep)) {
            inputEl.setValue((parseFloat(inputEl.getValue()) - fStep).toString());
        } else {
            inputEl.setValue((parseFloat(inputEl.getValue()) - 1).toString());
        }
    }

    private increment(inputEl: TextComponent): void {
        const { step } = this.field.options
        const fStep = parseFloat(step)
        if (!isNaN(fStep)) {
            inputEl.setValue((parseFloat(inputEl.getValue()) + fStep).toString());
        } else {
            inputEl.setValue((parseFloat(inputEl.getValue()) + 1).toString());
        }
    }

    private toggleButtonsState(minusBtn: ButtonComponent, plusBtn: ButtonComponent, inputEl: TextComponent): void {
        minusBtn.setDisabled(!this.fieldManager.canDecrement(inputEl.getValue()));
        plusBtn.setDisabled(!this.fieldManager.canIncrement(inputEl.getValue()));
        if (this.fieldManager.canDecrement(inputEl.getValue())) {
            minusBtn.setCta();
        } else {
            minusBtn.removeCta();
        }
        if (this.fieldManager.canIncrement(inputEl.getValue())) {
            plusBtn.setCta();
        } else {
            plusBtn.removeCta();
        }
    }

    private buildInputEl(inputDiv: HTMLDivElement): void {
        const { step } = this.field.options

        const form = inputDiv.createEl("form");
        form.type = "submit";

        const fieldContainer = form.createEl("div", { cls: "metadata-menu-modal-value-with-btn" })

        const inputEl = new TextComponent(fieldContainer);
        inputEl.inputEl.focus();
        inputEl.setValue(this.value);

        const minusBtn = new ButtonComponent(fieldContainer);
        minusBtn.setButtonText(`- ${!!step ? step : 1}`);

        const plusBtn = new ButtonComponent(fieldContainer);
        plusBtn.setButtonText(`+ ${!!step ? step : 1}`);
        plusBtn.setDisabled(!this.fieldManager.canIncrement(inputEl.getValue()));

        const errorField = form.createEl("div", { cls: "metadata-menu-modal-value-with-btn-error-field" })
        errorField.hide()

        const footer = form.createEl("div", { cls: "metadata-menu-value-grid-footer" })

        const validateBtn = new ButtonComponent(footer);
        validateBtn.setIcon("checkmark");

        const cancelBtn = new ButtonComponent(footer);
        cancelBtn.setIcon("cross");


        this.toggleButtonsState(minusBtn, plusBtn, inputEl);

        //event handlers
        inputEl.onChange(() => {
            inputEl.inputEl.removeClass("is-invalid")
            errorField.hide();
            errorField.setText("");
            this.toggleButtonsState(minusBtn, plusBtn, inputEl)
        })

        plusBtn.onClick((e) => {
            e.preventDefault();
            this.increment(inputEl);
            this.toggleButtonsState(minusBtn, plusBtn, inputEl);
        })

        minusBtn.onClick((e) => {
            e.preventDefault();
            this.decrement(inputEl);
            this.toggleButtonsState(minusBtn, plusBtn, inputEl);
        })

        cancelBtn.onClick((e) => {
            e.preventDefault();
            this.close()
        })

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            let inputValue = inputEl.getValue();
            if (!this.fieldManager.validateValue(inputValue)) {
                const { min, max } = this.field.options
                errorField.show();
                errorField.setText(`value must be numeric${min ? " and >= " + min : ""} ${max ? " and <= " + max : ""}`)
                inputEl.inputEl.setAttr("class", "is-invalid")
                return
            }
            if (this.lineNumber == -1) {
                await replaceValues(this.app, this.file, this.field.name, inputValue);
            } else {
                await insertValues(this.app, this.file, this.field.name, inputValue, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        };
    };
};