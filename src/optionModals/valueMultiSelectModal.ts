import { App, Modal, ToggleComponent, TFile, ButtonComponent, ExtraButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";

export default class valueMultiSelectModal extends Modal {

    private file: TFile;
    private name: string;
    private settings: Field;
    private options: Array<string>;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;

    constructor(app: App, file: TFile, name: string, initialOptions: string, settings: Field, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.name = name;
        this.settings = settings;
        if (initialOptions) {
            if (initialOptions.toString().startsWith("[[")) {
                this.options = initialOptions.split(",").map(item => item.trim());
            } else {
                this.options = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
            };
        } else {
            this.options = [];
        };
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
    };

    async onOpen() {
        this.containerEl.addClass("metadata-menu");

        const valueGrid = this.contentEl.createDiv({
            cls: "metadata-menu-value-grid"
        });
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.settings.valuesListNotePath, this.app)
        await this.populateValuesGrid(valueGrid, listNoteValues);
    };

    private async populateValuesGrid(valueGrid: HTMLDivElement, listNoteValues: string[]): Promise<void> {
        if (listNoteValues.length === 0) {
            Object.keys(this.settings.options).forEach(key => {
                const presetValue = this.settings.options[key];
                this.buildValueToggler(valueGrid, presetValue);
            })
        };
        listNoteValues.forEach(value => {
            this.buildValueToggler(valueGrid, value);
        });
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.name, this.options.join(","));
            } else {
                const result = await this.app.vault.read(this.file)
                let newContent: string[] = [];
                const renderedValues = !this.inFrontmatter ? this.options.join(",") : this.options.length > 1 ? `[${this.options.join(",")}]` : this.options
                if (this.top) {
                    newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${renderedValues}`);
                    result.split("\n").forEach((line, _lineNumber) => newContent.push(line));
                } else {
                    result.split("\n").forEach((line, _lineNumber) => {
                        newContent.push(line);
                        if (_lineNumber == this.lineNumber) {
                            newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${renderedValues}`);
                        };
                    });
                };

                this.app.vault.modify(this.file, newContent.join('\n'));
                this.close();
            };

            this.close();
        });
        const cancelButton = new ExtraButtonComponent(footer);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
    };

    private buildValueToggler(valueGrid: HTMLDivElement, presetOption: string) {
        const valueSelectorContainer = valueGrid.createDiv({
            cls: "metadata-menu-value-selector-container"
        });
        const valueTogglerContainer = valueSelectorContainer.createDiv({
            cls: "metadata-menu-value-selector-toggler"
        });
        const valueToggler = new ToggleComponent(valueTogglerContainer);
        this.options.forEach(options => {
            if (options == presetOption) {
                valueToggler.setValue(true)
            };
        });
        valueToggler.onChange(value => {
            if (value && !this.options.includes(presetOption)) {
                this.options.push(presetOption);
            };
            if (!value) {
                this.options.remove(presetOption);
            };
        });
        const valueLabel = valueSelectorContainer.createDiv({ cls: "metadata-menu-value-selector-label" });
        valueLabel.setText(presetOption);
    };
};