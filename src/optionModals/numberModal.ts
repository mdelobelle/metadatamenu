import { App, Modal, TextComponent, TFile, ButtonComponent } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";

export default class numbertModal extends Modal {

    private file: TFile;
    private value: string;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;
    private field: Field;

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv();
        this.buildInputEl(inputDiv);
    };

    private canDecrement(value: string): boolean {
        const { step, min } = this.field.options;
        const fStep = parseFloat(step);
        const fMin = parseFloat(min);
        return !(
            isNaN(parseFloat(value)) ||
            !isNaN(fMin) &&
            (
                !isNaN(fStep) && (
                    parseFloat(value) - fStep < fMin ||
                    parseFloat(value) - 1 < fMin
                )
            )
        )
    }

    private decrement(inputEl: TextComponent): void {
        const { step } = this.field.options;
        const fStep = parseFloat(step);
        if (!isNaN(fStep)) {
            inputEl.setValue((parseFloat(inputEl.getValue()) - fStep).toString());
        } else {
            inputEl.setValue((parseFloat(inputEl.getValue()) - 1).toString());
        }
    }

    private canIncrement(value: string): boolean {
        const { step, max } = this.field.options;
        const fStep = parseFloat(step);
        const fMax = parseFloat(max);
        return !(
            isNaN(parseFloat(value)) ||
            !isNaN(fMax) &&
            (
                !isNaN(fStep) && (
                    parseFloat(value) + fStep > fMax ||
                    parseFloat(value) + 1 > fMax
                )
            )
        )
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
        minusBtn.setDisabled(!this.canDecrement(inputEl.getValue()));
        plusBtn.setDisabled(!this.canIncrement(inputEl.getValue()));
        if (this.canDecrement(inputEl.getValue())) {
            minusBtn.setCta();
        } else {
            minusBtn.removeCta();
        }
        if (this.canIncrement(inputEl.getValue())) {
            plusBtn.setCta();
        } else {
            plusBtn.removeCta();
        }
    }

    private validateValue(value: string): boolean {
        const { min, max } = this.field.options;
        const fMin = parseFloat(min);
        const fMax = parseFloat(max);
        const fValue = parseFloat(value);
        return (
            !isNaN(fValue) && (isNaN(fMin) || fValue >= fMin) && (isNaN(fMax) || fValue <= fMax)
        )
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
        plusBtn.setDisabled(!this.canIncrement(inputEl.getValue()));

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
            if (!this.validateValue(inputValue)) {
                const { min, max } = this.field.options
                errorField.show();
                errorField.setText(`value must be numeric${min ? " and >= " + min : ""} ${max ? " and <= " + max : ""}`)
                inputEl.inputEl.setAttr("class", "is-invalid")
                return
            }
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.field.name, inputValue);
            } else {
                const result = await this.app.vault.read(this.file)
                let newContent: string[] = [];
                if (this.top) {
                    newContent.push(`${this.field.name}${this.inFrontmatter ? ":" : "::"} ${inputValue}`);
                    result.split("\n").forEach((line, _lineNumber) => newContent.push(line));
                } else {
                    result.split("\n").forEach((line, _lineNumber) => {
                        newContent.push(line);
                        if (_lineNumber == this.lineNumber) {
                            newContent.push(`${this.field.name}${this.inFrontmatter ? ":" : "::"} ${inputValue}`);
                        };
                    });
                };
                this.app.vault.modify(this.file, newContent.join('\n'));
                this.close();
            };
            this.close();
        };
    };
};