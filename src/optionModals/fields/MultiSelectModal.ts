import { App, Modal, ToggleComponent, TFile, ButtonComponent, ExtraButtonComponent, SuggestModal, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import FieldSetting from "src/settings/FieldSetting";
import { insertValues } from "src/commands/insertValues";

export default class MultiSuggestModal extends SuggestModal<string> {
    private file: TFile;
    private field: Field;
    private selectedOptions: Array<string>;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(app: App, file: TFile, field: Field, initialOptions: string, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
        if (initialOptions) {
            if (initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
            };
        } else {
            this.selectedOptions = [];
        };
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
    };

    onOpen() {
        const buttonContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-actions" })
        buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" })
        //confirm button
        const confirmButton = new ButtonComponent(buttonContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.replaceValues();
            this.close()
        })
        confirmButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        cancelButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("trash")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        clearButton.buttonEl.addClass("danger")

        this.modalEl.insertBefore(buttonContainer, this.modalEl.childNodes[0])
        super.onOpen()
    }

    async replaceValues() {
        const options = this.selectedOptions;
        if (this.lineNumber == -1) {
            await replaceValues(this.app, this.file, this.field.name, options.join(","));
        } else {
            const renderedValues = !this.inFrontmatter ? options.join(",") : options.length > 1 ? `[${options.join(", ")}]` : options[0]
            await insertValues(this.app, this.file, this.field.name, renderedValues, this.lineNumber, this.inFrontmatter, this.after);
        };
        this.close();
    }

    async clearValues() {
        if (this.lineNumber == -1) {
            await replaceValues(this.app, this.file, this.field.name, "");
        } else {
            await insertValues(this.app, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after);
        };
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: string[] = chooser.values

        suggestions.forEach((s, i) => {
            if (this.selectedOptions.includes(values[i])) {
                s.addClass("metadata-menu-value-selected")
                if (s.querySelectorAll(".metadata-menu-command-suggest-icon").length == 0) {
                    const iconContainer = s.createDiv({ cls: "metadata-menu-command-suggest-icon" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("metadata-menu-value-selected")
                s.querySelectorAll(".metadata-menu-command-suggest-icon").forEach(icon => icon.remove())
            }
        })
    }
    async getSuggestions(query: string): Promise<string[]> {
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.field.valuesListNotePath, this.app)
        if (listNoteValues.length === 0) {
            return Object.values(this.field.options).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        } else {
            return listNoteValues.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        }
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("metadata-menu-value-suggester-value-container")
        const spacer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-value-container-spacer" })
        el.appendChild(spacer)
        if (this.selectedOptions.includes(value)) {
            el.addClass("metadata-menu-value-selected")
            const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        if (this.selectedOptions.includes(value)) {
            this.selectedOptions.remove(value)
        } else {
            this.selectedOptions.push(value)
        }
        this.renderSelected()
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {

    }

}

export class MultiSelectModal extends Modal {

    private file: TFile;
    private field: Field;
    private options: Array<string>;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;

    constructor(app: App, file: TFile, field: Field, initialOptions: string, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.field = field;
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
        this.after = after;
    };

    async onOpen() {
        this.containerEl.addClass("metadata-menu");

        const valueGrid = this.contentEl.createDiv({
            cls: "metadata-menu-value-grid"
        });
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.field.valuesListNotePath, this.app)
        await this.populateValuesGrid(valueGrid, listNoteValues);
    };

    private async populateValuesGrid(valueGrid: HTMLDivElement, listNoteValues: string[]): Promise<void> {
        if (listNoteValues.length === 0) {
            Object.keys(this.field.options).forEach(key => {
                const presetValue = this.field.options[key];
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
                await replaceValues(this.app, this.file, this.field.name, this.options.join(","));
            } else {
                const renderedValues = !this.inFrontmatter ? this.options.join(",") : this.options.length > 1 ? `[${this.options.join(", ")}]` : this.options[0]
                await insertValues(this.app, this.file, this.field.name, renderedValues, this.lineNumber, this.inFrontmatter, this.after);
            };
            this.close();
        });
        const cancelButton = new ExtraButtonComponent(footer);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
        this.contentEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                saveButton.buttonEl.focus();
            }
        })
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