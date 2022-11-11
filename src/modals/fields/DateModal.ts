import { Modal, TextComponent, TFile, ToggleComponent, ButtonComponent } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";
import { FieldManager as FM } from "src/fields/FieldManager";
import { moment } from "obsidian";
import flatpickr from "flatpickr";
import MetadataMenu from "main";
import { FieldIcon, FieldType, FieldManager } from "src/types/fieldTypes";
import DateField from "src/fields/fieldManagers/DateField";

export default class DateModal extends Modal {

    private value: string;
    private insertAsLink: boolean;
    private inputEl: TextComponent;
    private errorField: HTMLDivElement;
    private format: string;
    private nextIntervalField?: Field;
    private pushNextInterval: boolean = false;
    private currentShift?: string
    private nextShift?: string
    private dateManager?: DateField
    private dvApi?: any

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private initialValue: string,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
    ) {
        super(plugin.app);
        this.initialValue = initialValue ? initialValue.toString().replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last() || "" : "";
        this.insertAsLink = FM.stringToBoolean(this.field.options.defaultInsertAsLink || "false") || false;
        this.format = this.field.options.dateFormat || this.field.options.defaultDateFormat;
        this.dvApi = this.plugin.app.plugins.plugins["dataview"]?.api
        if (this.dvApi) this.dateManager = new FieldManager[this.field.type](this.plugin, this.field);
        this.value = this.initialValue;
        this.containerEl.addClass("metadata-menu")

    };

    onOpen() {
        const fieldContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.buildFields(fieldContainer);
        this.errorField = this.contentEl.createEl("div", { cls: "field-error" });
        this.errorField.hide();

    };

    private buildFields(dateFieldsContainer: HTMLDivElement) {

        this.buildInputEl(dateFieldsContainer);
        this.buildInsertAsLinkButton(dateFieldsContainer);
        dateFieldsContainer.createDiv({ cls: "spacer" })
        const saveBtn = new ButtonComponent(dateFieldsContainer)
        saveBtn.setIcon("checkmark")

        saveBtn.onClick(async (e: Event) => {
            e.preventDefault();
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
                if (this.lineNumber == -1) {
                    await this.plugin.fileTaskManager
                        .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, formattedValue) });
                } else {
                    await this.plugin.fileTaskManager
                        .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, formattedValue, this.lineNumber, this.inFrontmatter, this.after, this.asList, this.asComment) });
                };
                if (this.nextIntervalField && this.pushNextInterval && this.nextShift) {
                    await this.plugin.fileTaskManager
                        .pushTask(() => { replaceValues(this.plugin, this.file.path, this.nextIntervalField!.name, this.nextShift!) });
                }
                this.close();
            } else if (!this.value) {
                if (this.lineNumber == -1) {
                    await this.plugin.fileTaskManager
                        .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, "") });
                } else {
                    await this.plugin.fileTaskManager
                        .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after, this.asList, this.asComment) });
                };
                this.close()
            } else {
                this.errorField.show();
                this.errorField.setText(`value must be a valid date`)
                this.inputEl.inputEl.addClass("is-invalid")
                return
            }
        });
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

    private buildInputEl(container: HTMLDivElement): void {
        //let currentDvDuration: any;

        if (this.dateManager) [this.currentShift, this.nextIntervalField, this.nextShift] = this.dateManager.shiftDuration(this.file);

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
            const currentDvDate = this.dvApi.date(moment(this.initialValue, this.format).toISOString());
            const newDate = currentDvDate.plus(this.dvApi.duration(this.currentShift || "1 day"));
            const newValue = moment(newDate.toString()).format(this.format)
            this.inputEl.setValue(newValue);
            this.value = newValue;
            this.pushNextInterval = true;
            this.toggleButton(shiftFromTodayBtn, this.inputEl.getValue())
        })

        if (!this.dvApi) {
            shiftFromTodayBtn.buttonEl.hide();
            shiftFromTodayBtn.setDisabled(true);
        }
    };
};
