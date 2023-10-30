import { TextComponent, TFile, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager as FM } from "src/fields/FieldManager";
import { moment } from "obsidian";
import flatpickr from "flatpickr";
import MetadataMenu from "main";
import { FieldIcon, FieldType, FieldManager } from "src/types/fieldTypes";
import DateField from "src/fields/fieldManagers/DateField";
import { postValues } from "src/commands/postValues";
import BaseModal from "../baseModal";
import { cleanActions } from "src/utils/modals";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";

export default class DateModal extends BaseModal {

    private value: string;
    private insertAsLink: boolean;
    private inputEl: TextComponent;
    private errorField: HTMLDivElement;
    private format: string;
    private nextIntervalField?: Field;
    private pushNextInterval: boolean = false;
    private currentShift?: string
    private nextShift?: string
    private dateManager: DateField
    private initialValue: string

    constructor(
        public plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin);
        const initialValue = this.eF?.value || ""
        this.initialValue = initialValue ? initialValue.toString().replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last() || "" : "";
        this.insertAsLink = FM.stringToBoolean(this.field.options.defaultInsertAsLink || "false") || false;
        this.format = this.field.options.dateFormat || this.field.options.defaultDateFormat;
        this.dateManager = new FieldManager[this.field.type](this.plugin, this.field);
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

    onClose(): void {
        this.previousModal?.open()
    }

    public async save(e: Event): Promise<void> {
        //e.preventDefault();
        let newValue: moment.Moment;
        //try natural language date
        if (this.plugin.app.plugins.enabledPlugins.has('nldates-obsidian')) {
            //@ts-ignore
            try {
                const nldates = this.plugin.app.plugins.plugins['nldates-obsidian'];
                newValue = nldates.parseDate(this.value).moment;
            } catch (error) {
                newValue = moment(this.value, this.format);
            }
        } else {
            newValue = moment(this.value, this.format);
        }
        if (newValue.isValid()) {
            const linkPath = this.plugin.app.metadataCache.getFirstLinkpathDest(this.field.options.linkPath || "" + newValue.format(this.format), this.file.path)
            const formattedValue = this.insertAsLink ? `[[${this.field.options.linkPath || ""}${newValue.format(this.format)}${linkPath ? "|" + linkPath.basename : ""}]]` : newValue.format(this.format)
            await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: formattedValue } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
            if (this.nextIntervalField && this.pushNextInterval && this.nextShift) {
                await postValues(this.plugin, [{ id: this.nextIntervalField!.id, payload: { value: this.nextShift! } }], this.file.path)
                this.close()
            }
            this.close();
        } else if (!this.value) {
            await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
            this.close()
        } else {
            this.errorField.show();
            this.errorField.setText(`value must be a valid date`)
            this.inputEl.inputEl.addClass("is-invalid")
            return
        }
    }

    private async buildFields(dateFieldsContainer: HTMLDivElement): Promise<void> {

        await this.buildInputEl(dateFieldsContainer);
        this.buildInsertAsLinkButton(dateFieldsContainer);
        this.buildSimpleSaveBtn(dateFieldsContainer);
    }

    private buildInsertAsLinkButton(container: HTMLDivElement) {
        const insertAsLinkBtn = new ButtonComponent(container);
        const setLinkBtnIcon = () => {
            insertAsLinkBtn.setIcon(this.insertAsLink ? "link" : "unlink");
            insertAsLinkBtn.setTooltip(this.insertAsLink ?
                "Click to insert date as text" :
                "Click to insert date as link"
            )
        }
        setLinkBtnIcon();
        insertAsLinkBtn.onClick(() => {
            this.insertAsLink = !this.insertAsLink;
            setLinkBtnIcon();
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
        [this.currentShift, this.nextIntervalField, this.nextShift] = await this.dateManager.shiftDuration(this.file);
        this.inputEl = new TextComponent(container);
        this.inputEl.inputEl.focus();

        this.inputEl.setPlaceholder(
            this.initialValue ?
                moment(this.initialValue, this.field.options.dateFormat).format(this.field.options.dateFormat)
                : "");
        this.inputEl.onChange(value => {
            this.inputEl.inputEl.removeClass("is-invalid")
            this.errorField.hide();
            this.errorField.setText("");
            this.value = value
            this.toggleButton(shiftFromTodayBtn, value)
        });
        const calendarDisplayBtn = new ButtonComponent(container)
        calendarDisplayBtn.setIcon(FieldIcon[FieldType.Date])
        calendarDisplayBtn.setTooltip("open date picker")
        const shiftFromTodayBtn = new ButtonComponent(container)
        shiftFromTodayBtn.setIcon("skip-forward")
        shiftFromTodayBtn.setTooltip(`Shift ${this.field.name} ${this.currentShift || "1 day"} ahead`)

        const datePickerContainer = container.createDiv();

        const datePicker = flatpickr(datePickerContainer, {
            locale: {
                firstDayOfWeek: this.plugin.settings.firstDayOfWeek
            },
            defaultDate: moment(Date.now()).format("YYYY-MM-DD")
        });
        datePicker.config.onChange.push((value) => {
            const newDate = moment(value.toString()).format(this.format);
            this.inputEl.setValue(newDate);
            this.value = newDate;
            this.toggleButton(shiftFromTodayBtn, this.value)
        })

        calendarDisplayBtn.onClick((e: MouseEvent) => {
            e.preventDefault();
            datePicker.setDate(datePicker.parseDate(this.inputEl.getValue()) || new Date())
            datePicker.open();
        })

        shiftFromTodayBtn.onClick(async (e: MouseEvent) => {
            const newValue = await this.dateManager.getNewDateValue(this.currentShift, this.file, this.indexedPath)
            this.inputEl.setValue(newValue);
            this.value = newValue;
            this.pushNextInterval = true;
            this.toggleButton(shiftFromTodayBtn, this.inputEl.getValue())
        })
    };
};
