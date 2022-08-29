import { App, Modal, DropdownComponent, TFile, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";
import { insertValues } from "src/commands/insertValues";

export default class valueSelectModal extends Modal {

    private file: TFile;
    private value: string;
    private field: Field;
    private newValue: string | null;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(app: App, file: TFile, value: string, field: Field, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        this.value = value;
        this.newValue = null;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    };

    async onOpen() {
        this.containerEl.addClass("metadata-menu");
        const inputDiv = this.contentEl.createDiv({ cls: "metadata-menu-modal-value" });
        await this.buildInputEl(inputDiv);
    };

    private async buildInputEl(inputDiv: HTMLDivElement): Promise<void> {
        const selectEl = new DropdownComponent(inputDiv);
        selectEl.selectEl.addClass("metadata-menu-select");

        const options = this.field.options;
        selectEl.addOption("", "--Empty--");
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.field.valuesListNotePath, this.app)
        listNoteValues.forEach(value => selectEl.addOption(value, value));
        if (listNoteValues.includes(this.value)) {
            selectEl.setValue(this.value);
        };
        if (listNoteValues.length === 0) {
            Object.keys(options).forEach(key => {
                selectEl.addOption(options[key], options[key]);
            });
            if (Object.values(options).includes(this.value)) {
                selectEl.setValue(this.value);
            };
        }
        const submitButton = new ButtonComponent(inputDiv);
        selectEl.onChange(value => {
            this.newValue = value != "--Empty--" ? value : "";
            submitButton.buttonEl.focus();
        });
        submitButton.setTooltip("Save")
            .setIcon("checkmark")
            .onClick(async () => {
                if (this.lineNumber == -1) {
                    if (this.newValue || this.newValue == "") {
                        await replaceValues(this.app, this.file, this.field.name, this.newValue);
                    };
                } else {
                    await insertValues(this.app, this.file, this.field.name, selectEl.getValue(), this.lineNumber, this.inFrontmatter, this.after);
                };
                this.close();
            });
    };
};