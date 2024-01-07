import { TextComponent, TFile, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { moment } from "obsidian";
import MetadataMenu from "main";
import { FieldManager } from "src/types/fieldTypes";
import { postValues } from "src/commands/postValues";
import BaseModal from "../baseFieldModals/BaseModal";
import { cleanActions } from "src/utils/modals";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";
import { HTMLDateInputElement } from "src/typings/types";
import TimeField from "src/fields/fieldManagers/TimeField";

export default class TimeModal extends BaseModal {
    private value: string;
    private inputEl: TextComponent;
    private errorField: HTMLDivElement;
    private format: string;
    private nextIntervalField?: Field;
    private pushNextInterval: boolean = false;
    private currentShift?: string
    private nextShift?: string
    private timeManager: TimeField
    private initialValue: string

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
        super(plugin, file, previousModal);
        const initialValue = this.eF?.value || ""
        this.initialValue = initialValue ? initialValue.toString().replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last() || "" : "";
        this.format = this.field.options.timeFormat || this.field.options.defaultTimeFormat;
        this.timeManager = new FieldManager[this.field.type](this.plugin, this.field);
        this.value = this.initialValue;
    };

    async onOpen() {
        super.onOpen()
        this.containerEl.addClass("metadata-menu")
        cleanActions(this.contentEl, ".field-container");
        cleanActions(this.contentEl, ".field-error");
        const fieldContainer = this.contentEl.createDiv({ cls: "field-container" });
        await this.buildFields(fieldContainer);
        this.errorField = this.contentEl.createEl("div", { cls: "field-error" });
        this.errorField.hide();
    };

    public async save(): Promise<void> {
        const newValue = moment(`${this.value}`, this.format);
        if (newValue.isValid()) {
            const formattedValue = newValue.format(this.format)
            await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: formattedValue } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
            this.saved = true
            if (this.previousModal) await this.goToPreviousModal()
            if (this.nextIntervalField && this.pushNextInterval && this.nextShift) {
                await postValues(this.plugin, [{ indexedPath: this.nextIntervalField!.id, payload: { value: this.nextShift! } }], this.file.path)
                this.close()
            }
            this.close();
        } else if (!this.value) {
            await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: "" } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
            this.saved = true
            if (this.previousModal) await this.goToPreviousModal()
            this.close()
        } else {
            this.errorField.show();
            this.errorField.setText(`value must be a valid time`)
            this.inputEl.inputEl.addClass("is-invalid")
            return
        }
    }

    private async buildFields(timeFieldsContainer: HTMLDivElement): Promise<void> {

        await this.buildInputEl(timeFieldsContainer);
        this.buildClearBtn(timeFieldsContainer);
        this.buildSimpleSaveBtn(timeFieldsContainer);
    }

    private buildClearBtn(container: HTMLDivElement) {
        const clearBtn = new ButtonComponent(container);
        clearBtn.setIcon("eraser");
        clearBtn.setTooltip(`Clear ${this.field.name}'s time`)
        clearBtn.onClick(() => {
            this.value = "";
            this.inputEl.setValue("")
            this.inputEl.setPlaceholder("Empty")
        })
    }

    private toggleButton(button: ButtonComponent, value: string): void {
        button.setDisabled(!!value)
        if (value) {
            button.buttonEl.addClass("disabled")
        } else {
            button.buttonEl.removeClass("disabled")
        }
    }

    private async buildInputEl(container: HTMLDivElement): Promise<void> {
        [this.currentShift, this.nextIntervalField, this.nextShift] = await this.timeManager.shiftDuration(this.file);
        const wrapper = container.createDiv({ cls: "date-input-wrapper" })
        this.inputEl = new TextComponent(wrapper)
        this.inputEl.inputEl.addClass("master-input")
        this.inputEl.inputEl.addClass("time")
        this.inputEl.inputEl.focus();
        this.inputEl.setPlaceholder(
            this.initialValue ?
                moment(this.initialValue, this.field.options.timeFormat).format(this.field.options.timeFormat)
                : "");
        this.inputEl.onChange(value => {
            this.inputEl.inputEl.removeClass("is-invalid")
            this.errorField.hide();
            this.errorField.setText("");
            this.value = value
            this.toggleButton(shiftFromTodayBtn, value)
        });
        const calendarInput = wrapper.createEl(
            "input",
            {
                type: "time",
                cls: "time-picker"
            }
        )
        calendarInput.value = this.initialValue ?
            moment(this.initialValue, this.field.options.timeFormat).format(this.field.options.timeFormat)
            : "";
        calendarInput.oninput = (e) => {
            const newValue = moment((e.target as HTMLInputElement)?.value, "HH:mm").format(this.format)
            this.inputEl.setValue(newValue)
            this.value = newValue
        }
        const shiftFromTodayBtn = new ButtonComponent(container)
        shiftFromTodayBtn.setIcon("skip-forward")
        shiftFromTodayBtn.setTooltip(`Shift ${this.field.name} ${this.currentShift || "1 hour"} ahead`)
        shiftFromTodayBtn.onClick(async (e: MouseEvent) => {
            const newValue = await this.timeManager.getNewTimeValue(this.currentShift, this.file, this.indexedPath)
            this.inputEl.setValue(newValue);
            this.value = newValue;
            this.pushNextInterval = true;
            this.toggleButton(shiftFromTodayBtn, this.inputEl.getValue())
        })
    };
};
