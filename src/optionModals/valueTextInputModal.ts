import { App, Modal, TextComponent, TFile, ToggleComponent } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";

export default class valueTextInputModal extends Modal {

    private file: TFile;
    private value: string;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;
    private parseDate: boolean = false;
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
        const inputDiv = this.contentEl.createDiv({ cls: "metadata-menu-modal-value" });
        this.buildInputEl(inputDiv);
    };

    buildDateParseToggler(container: HTMLElement) {
        //@ts-ignore
        const nldates = app.plugins.plugins['nldates-obsidian'];
        const dateParserLabel = container.createDiv({
            cls: "metadata-menu-date-parser-label"
        });
        dateParserLabel.setText("📆");
        const dateParserToggler = new ToggleComponent(container);
        dateParserToggler.setValue(this.parseDate)
        dateParserToggler.onChange(value => {
            this.parseDate = value;
        });
        dateParserLabel.onclick = () => dateParserToggler.setValue(!this.parseDate);
    };

    private buildInputEl(inputDiv: HTMLDivElement): void {
        //@ts-ignore
        if (app.plugins.plugins.hasOwnProperty('nldates-obsidian') && this.field.type === FieldType.Input) {
            this.buildDateParseToggler(inputDiv);
        };
        const form = inputDiv.createEl("form");
        form.type = "submit";

        const inputEl = new TextComponent(form);
        inputEl.inputEl.focus();
        inputEl.setValue(this.value);
        inputEl.inputEl.addClass("metadata-menu-prompt-input");

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            let inputValue = inputEl.getValue();
            //@ts-ignore
            if (app.plugins.plugins.hasOwnProperty('nldates-obsidian') && this.parseDate && this.field.type === FieldType.Input) {
                //@ts-ignore
                const nldates = app.plugins.plugins['nldates-obsidian'];
                const format = nldates.settings.format;
                let textStart = "";
                let textEnd = "";
                let date = "";
                const selectionStart = inputEl.inputEl.selectionStart;
                const selectionEnd = inputEl.inputEl.selectionEnd;
                if (selectionEnd == selectionStart) {
                    date = nldates.parseDate(inputEl.getValue()).moment.format(format);
                } else {
                    textStart = inputEl.getValue().slice(0, selectionStart!);
                    date = nldates.parseDate(inputEl.getValue().slice(selectionStart!, selectionEnd!)).moment.format(format);
                    textEnd = inputEl.getValue().slice(selectionEnd!);
                };
                inputValue = textStart + "[[" + date + "]]" + textEnd;
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