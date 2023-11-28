import Field from "../fields/Field";
import { FieldManager as FM, FieldType } from "src/types/fieldTypes";
import { TextComponent, ButtonComponent, setIcon, Debouncer, TFile, SuggestModal } from "obsidian";
import MetadataMenu from "main";
import { FieldSet } from "src/fileClass/tableViewFieldSet";
import { getLink } from "src/utils/parser";
import FileField from "../fields/fieldManagers/FileField";
import { cleanActions } from "src/utils/modals";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";

export class OptionsMultiSelectModal extends SuggestModal<string>{
    private selectedOptions: Array<string>;
    private input: TextComponent;

    constructor(
        public plugin: MetadataMenu,
        public fileClassFile: TFile,
        public field: Field,
        public parentFieldSet: FieldSet
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildFooterActions(footerActionsContainer)
        this.input = this.parentFieldSet.filters[this.field.name] as TextComponent
        const initialOptions = this.input.getValue()
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                this.selectedOptions = initialOptions.map(item => {
                    const link = getLink(item, fileClassFile)
                    if (link) {
                        return FileField.buildMarkDownLink(this.plugin, fileClassFile, link.path)
                    } else {
                        return item.toString()
                    }
                })
                this.selectedOptions = initialOptions.map(item => item.toString())
            }
            else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                const link = getLink(initialOptions, fileClassFile)
                if (link) {
                    this.selectedOptions = [`[[${link.path.replace(".md", "")}]]`]
                } else if (typeof (initialOptions) === "string") {
                    this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
                }
            }
        } else {
            this.selectedOptions = [];
        }
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                await this.replaceValues();
                this.close()
            }
        }
    };

    getSuggestions(query: string): string[] {
        const multiTypes = [
            FieldType.Multi,
            FieldType.MultiFile,
            FieldType.Select,
            FieldType.File
        ]
        if (multiTypes.includes(this.field.type)) {
            const fieldManager = new FM[this.field.type](this.plugin, this.field) as AbstractListBasedField
            const values = fieldManager.getOptionsList().filter(o => String(o).toLowerCase().includes(query.toLowerCase()))
            return values
        } else if (this.field.type === FieldType.Lookup) {
            const values = [...this.plugin.fieldIndex.fileLookupFieldLastValue.entries()].filter(([fieldId, lookupFiles]) => {
                return fieldId.endsWith(`__related__${this.fileClassFile.basename}___${this.field.name}`) && lookupFiles !== ""
            }).map(([fieldId, lookupFiles]) => lookupFiles).join(",")
            return [...new Set(values.split(",").map(item => item.trim().replace(/\[\[|\]\]/g, "")))]
        } else {
            return []
        }
    }

    buildFooterActions(footerActionsContainer: HTMLDivElement) {
        footerActionsContainer.createDiv({ cls: "spacer" })
        //confirm button
        this.buildConfirm(footerActionsContainer)
        //cancel button
        const cancelButton = new ButtonComponent(footerActionsContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(footerActionsContainer)
        clearButton.setIcon("eraser")
        clearButton.setTooltip("Clear field's value(s)")
        clearButton.onClick(async () => {
            this.input.setValue("")
            this.parentFieldSet.tableView.udpate()
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(footerActionsContainer)
    }

    buildConfirm(footerActionsContainer: HTMLDivElement) {
        const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const confirmButton = new ButtonComponent(footerActionsContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.replaceValues();
            this.close()
        })
    }

    async replaceValues() {
        const options = this.selectedOptions;
        this.input.inputEl.value = options.join(", ");
        this.parentFieldSet.tableView.udpate()
        this.close();
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: string[] = chooser.values
        suggestions.forEach((s, i) => {
            if (this.selectedOptions.includes(values[i].toString())) {
                s.addClass("value-checked")
                if (s.querySelectorAll(".icon-container").length == 0) {
                    const iconContainer = s.createDiv({ cls: "icon-container" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("value-checked")
                s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
            }
        })
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("value-container")
        const spacer = this.containerEl.createDiv({ cls: "spacer" })
        el.appendChild(spacer)
        if (this.selectedOptions.includes(value.toString())) {
            el.addClass("value-checked")
            const iconContainer = el.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        if (this.selectedOptions.includes(value.toString())) {
            this.selectedOptions.remove(value.toString())
        } else {
            this.selectedOptions.push(value.toString())
        }
        this.renderSelected()
    }
    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) { }
}