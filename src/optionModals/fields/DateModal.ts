import { App, Modal, TextComponent, TFile, ToggleComponent, ButtonComponent, setIcon } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { moment } from "obsidian";
import flatpickr from "flatpickr";
import MetadataMenu from "main";

export default class DateModal extends Modal {

    private file: TFile;
    private value: string;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;
    private insertAsLink: boolean;
    private field: Field;
    private inputEl: TextComponent;
    private errorField: HTMLDivElement;
    private format: string;
    private plugin: MetadataMenu;

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value.toString().replace(/^\[\[/g, "").replace(/\]\]$/g, "");
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
        this.insertAsLink = FieldManager.stringToBoolean(this.field.options.defaultInsertAsLink || "false") || false;
        this.format = this.field.options.dateFormat || this.field.options.defaultDateFormat;
        if (this.app.plugins.enabledPlugins.has("metadata-menu")) {
            this.plugin = this.app.plugins.plugins["metadata-menu"]
        }
    };

    onOpen() {
        const fieldContainer = this.contentEl.createDiv({ cls: "metadata-menu-modal-value" });
        this.buildForm(fieldContainer);
    };

    private buildForm(parentContainer: HTMLDivElement) {

        const form = parentContainer.createEl("form");
        form.type = "submit";
        this.buildInputEl(form);
        this.errorField = form.createEl("div", { cls: "metadata-menu-modal-value-error-field" });
        this.errorField.hide();
        this.buildInsertAsLinkToggler(form);
        const saveBtnContainer = form.createEl("div", { cls: "metadata-menu-value-grid-footer" });
        const saveBtn = new ButtonComponent(saveBtnContainer)
        saveBtn.setIcon("checkmark")

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            let newValue: moment.Moment;
            //@ts-ignore

            //try natural language date
            if (app.plugins.enabledPlugins.has('nldates-obsidian')) {
                //@ts-ignore
                try {
                    const nldates = app.plugins.plugins['nldates-obsidian'];
                    newValue = nldates.parseDate(this.value).moment;
                } catch (error) {
                    newValue = moment(this.value, this.format);
                }
            } else {
                newValue = moment(this.value, this.format);
            }
            if (newValue.isValid()) {
                const linkPath = app.metadataCache.getFirstLinkpathDest(this.field.options.linkPath || "" + newValue.format(this.format), this.file.path)
                const formattedValue = this.insertAsLink ? `[[${this.field.options.linkPath || ""}${newValue.format(this.format)}${linkPath ? "|" + linkPath.basename : ""}]]` : newValue.format(this.format)
                if (this.lineNumber == -1) {
                    replaceValues(this.app, this.file, this.field.name, formattedValue);
                } else {
                    insertValues(this.app, this.file, this.field.name, formattedValue, this.lineNumber, this.inFrontmatter, this.top);
                };
                this.close();
            } else {
                this.errorField.show();
                this.errorField.setText(`value must be a valid date`)
                this.inputEl.inputEl.addClass("is-invalid")
                return
            }
        };
    }

    private buildInsertAsLinkToggler(form: HTMLFormElement) {
        const togglerContainer = form.createDiv({ cls: "metadata-menu-toggler-with-label" })
        const togglerContainerLabel = togglerContainer.createDiv({
            cls: "metadata-menu-toggler-label"
        });
        togglerContainerLabel.setText("Insert as link");
        const toggleEl = new ToggleComponent(togglerContainer);
        toggleEl.setValue(FieldManager.stringToBoolean(this.field.options.defaultInsertAsLink || "false"))
        toggleEl.onChange((value) => {
            this.insertAsLink = value
        });
    }

    private buildInputEl(form: HTMLFormElement): void {
        const inputContainer = form.createDiv({ cls: "metadata-menu-dateinput-with-picker" })
        this.inputEl = new TextComponent(inputContainer);
        this.inputEl.inputEl.focus();
        this.inputEl.setValue(this.value.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last() || "");
        this.inputEl.inputEl.addClass("metadata-menu-prompt-input");
        this.inputEl.onChange(value => {
            this.inputEl.inputEl.removeClass("is-invalid")
            this.errorField.hide();
            this.errorField.setText("");
            this.value = value
        });
        const calendarDisplayBtn = inputContainer.createEl("div", { cls: "metadata-menu-calendar-display-btn" })
        setIcon(calendarDisplayBtn, "calendar-with-checkmark");
        const datePickerContainer = form.createDiv({ cls: "metadata-menu-picker-container" });
        const datePicker = flatpickr(datePickerContainer, {
            locale: {
                firstDayOfWeek: this.plugin.settings.firstDayOfWeek
            }
        });
        datePicker.config.onChange.push((value) => {
            const newDate = moment(value.toString()).format(this.format);
            this.inputEl.setValue(newDate);
            this.value = newDate;

        })

        calendarDisplayBtn.onclick = (e: MouseEvent) => {
            datePicker.setDate(datePicker.parseDate(this.inputEl.getValue()) || new Date())
            datePicker.open()
        }

    };
};