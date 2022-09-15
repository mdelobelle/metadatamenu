import { TFile, ButtonComponent, SuggestModal, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";

export default class MultiSuggestModal extends SuggestModal<string> {

    private selectedOptions: Array<string>;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        initialOptions: string,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
        if (initialOptions) {
            if (initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
            };
        } else {
            this.selectedOptions = [];
        };
    };

    onOpen() {
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.shiftKey) {
                await this.replaceValues();
                this.close()
            }
        }
        const buttonContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-actions" })
        buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-info" })
        infoContainer.setText("Shift+Enter to save")
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
            await replaceValues(this.plugin, this.file, this.field.name, options.join(", "));
        } else {
            const renderedValues = !this.inFrontmatter ? options.join(", ") : options.length > 1 ? `[${options.join(", ")}]` : options[0]
            await insertValues(this.plugin, this.file, this.field.name, renderedValues, this.lineNumber, this.inFrontmatter, this.after);
        };
        this.close();
    }

    async clearValues() {
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, "");
        } else {
            await insertValues(this.plugin, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after);
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
    getSuggestions(query: string): string[] {
        const listNoteValues = this.plugin.fieldIndex.valuesListNotePathValues.get(this.field.valuesListNotePath)
        if (listNoteValues?.length === 0 || !listNoteValues) {
            return Object.values(this.field.options).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        } else {
            return listNoteValues!.filter(o => o.toLowerCase().includes(query.toLowerCase()))
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