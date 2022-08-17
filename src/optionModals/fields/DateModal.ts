import { App, Modal, TextComponent, TFile, ToggleComponent, ButtonComponent } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";
import { FieldManager } from "src/fields/FieldManager";
import { moment } from "obsidian";

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

    constructor(app: App, file: TFile, field: Field, value: string, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value.replace(/^\[\[/g, "").replace(/\]\]$/g, "");
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
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
            const format = this.field.options.dateFormat;
            let newValue: moment.Moment;
            //@ts-ignore

            //try natural language date
            if (app.plugins.plugins.hasOwnProperty('nldates-obsidian')) {
                //@ts-ignore
                try {
                    const nldates = app.plugins.plugins['nldates-obsidian'];
                    newValue = nldates.parseDate(this.value).moment;
                } catch (error) {
                    newValue = moment(this.value);
                }
            } else {
                newValue = moment(this.value);
            }
            if (newValue.isValid()) {
                const formattedValue = this.insertAsLink ? `[[${newValue.format(format)}]]` : newValue.format(format)
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
        this.inputEl = new TextComponent(form);
        this.inputEl.inputEl.focus();
        this.inputEl.setValue(this.value);
        this.inputEl.inputEl.addClass("metadata-menu-prompt-input");
        this.inputEl.onChange(value => {
            this.inputEl.inputEl.removeClass("is-invalid")
            this.errorField.hide();
            this.errorField.setText("");
            this.value = value
        });

    };
};