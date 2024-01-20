import { ButtonComponent, DropdownComponent, Modal, SuggestModal, TFile, TextAreaComponent, TextComponent, setIcon } from "obsidian"
import { BaseOptions } from "../../base/BaseField"
import { ISettingsModal } from "../../base/BaseSetting"
import { FileSuggest } from "src/suggester/FileSuggester"
import { IFieldManager, Target, isSingleTargeted, removeValidationError } from "../../Field"
import MetadataMenu from "main"
import { BaseValueModal, IBaseValueModal } from "../../base/BaseModal"
import { cleanActions } from "src/utils/modals"
import { Constructor } from "src/typings/types"


export enum SourceType {
    "ValuesList" = "ValuesList",
    "ValuesListNotePath" = "ValuesListNotePath",
    "ValuesFromDVQuery" = "ValuesFromDVQuery"
}

export const SourceTypeKey: Record<keyof typeof SourceType, string> = {
    "ValuesList": "valuesList",
    "ValuesListNotePath": "valuesListNotePath",
    "ValuesFromDVQuery": "valuesFromDVQuery"
}

export const SourceTypeDisplay: Record<keyof typeof SourceType, string> = {
    "ValuesList": "Values defined in these settings",
    "ValuesListNotePath": "Values from a note",
    "ValuesFromDVQuery": "Values returned from a dataview query"
}

export interface Options extends BaseOptions {
    valuesNotePath?: string
    valuesList?: Record<string, string> | string[]
    dvQuery?: string
    sourceType: "ValuesListNotePath" | "ValuesList" | "ValuesFromDVQuery"
}

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class ListBaseSettingsModal extends Base {
        private valuesPromptComponents: TextComponent[] = []

        createSettingContainer() {
            const container = this.optionsContainer
            const field = this.field
            const sourceTypeContainer = container.createDiv({ cls: "field-container" });
            sourceTypeContainer.createDiv({ text: "Values source type", cls: "label" })
            sourceTypeContainer.createDiv({ cls: "spacer" });
            const sourceType = new DropdownComponent(sourceTypeContainer);

            //manage new field and fileClass legacy field
            if (!field.options.sourceType) {
                //this is a new field or fileClass legacy field
                if (typeof field.options === "object" && Object.keys(field.options).every(key => !isNaN(parseInt(key)))) {
                    //this is a fileClass legacy field
                    const valuesList: Record<string, string> = {}
                    Object.keys(field.options).forEach((key: string) => valuesList[key] = field.options[key]);
                    field.options = {}
                    field.options.valuesList = valuesList;
                } else {
                    field.options = {}
                }
                field.options.sourceType = SourceType.ValuesList;
                field.options.valuesListNotePath = "";
                field.options.valuesFromDVQuery = "";
            }
            Object.keys(SourceType).forEach((option: keyof typeof SourceType) => sourceType.addOption(option, SourceTypeDisplay[option]))
            sourceType.setValue(field.options.sourceType || SourceType.ValuesList)

            const valuesListNotePathContainer = this.createListNotePathContainer(container);
            const presetValuesFieldsContainer = this.createValuesListContainer(container);
            const valuesFromDVQueryContainer = this.createValuesFromDVQueryContainer(container);

            const valuesContainers: Record<keyof typeof SourceType, HTMLDivElement> = {
                "ValuesList": presetValuesFieldsContainer,
                "ValuesListNotePath": valuesListNotePathContainer,
                "ValuesFromDVQuery": valuesFromDVQueryContainer
            }

            sourceType.onChange((value: keyof typeof SourceType) => {
                field.options.sourceType = value;
                this.displaySelectedTypeContainer(valuesContainers, value)
            })
            this.displaySelectedTypeContainer(valuesContainers, field.options.sourceType)
        }


        private createListNotePathContainer(container: HTMLDivElement): HTMLDivElement {
            const valuesListNotePathContainer = container.createDiv({ cls: "field-container" });
            valuesListNotePathContainer.createDiv({ text: `Path of the note`, cls: "label" });
            const input = new TextComponent(valuesListNotePathContainer);
            input.inputEl.addClass("full-width");
            input.inputEl.addClass("with-label");
            new FileSuggest(
                input.inputEl,
                this.plugin,
                "/"
            )
            const listNotePath = this.field.options.valuesListNotePath;
            input.setValue(listNotePath || "");
            input.setPlaceholder("Path/of/the/note.md");
            input.onChange(value => this.field.options.valuesListNotePath = value);
            return valuesListNotePathContainer;
        }

        private createValuesListContainer(parentContainer: HTMLDivElement): HTMLDivElement {
            const presetValuesFields = parentContainer.createDiv()
            const valuesList = presetValuesFields.createDiv();
            const valuesListBody = valuesList.createDiv();
            Object.keys(this.field.options.valuesList).forEach(key => {
                this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, key));
            });
            this.createAddButton(valuesList, valuesListBody)
            return presetValuesFields;
        }

        private createValueContainer(parentNode: HTMLDivElement, key: string): TextComponent {
            const values = this.field.options.valuesList || {};
            const presetValue = values[key];
            const valueContainer = parentNode.createDiv({ cls: 'field-container', });
            const input = new TextComponent(valueContainer);
            input.inputEl.addClass("full-width");
            input.setValue(presetValue);
            input.onChange(value => {
                this.field.options.valuesList[key] = value;
                removeValidationError(input);
            });
            const valueRemoveButton = new ButtonComponent(valueContainer);
            valueRemoveButton.setIcon("trash")
                .onClick((evt: MouseEvent) => {
                    evt.preventDefault();
                    removeValidationError(input);
                    this.removePresetValue(key);
                    parentNode.removeChild(valueContainer);
                    this.valuesPromptComponents.remove(input);
                });
            if (key != Object.keys(this.field.options)[0]) {
                const valueUpgradeButton = new ButtonComponent(valueContainer);
                setIcon(valueUpgradeButton.buttonEl, "up-chevron-glyph");
                valueUpgradeButton.onClick((evt: MouseEvent) => {
                    const thisValue = values[key];
                    const inputIndex = this.valuesPromptComponents.indexOf(input)
                    const upperComponent = inputIndex !== -1 ? this.valuesPromptComponents[inputIndex - 1] : this.valuesPromptComponents.last();
                    if (upperComponent) {
                        const upperValue = upperComponent.inputEl.value;
                        const upperKey = Object.keys(values).filter(k => values[k] == upperValue)[0];
                        if (upperKey) {
                            upperComponent.setValue(thisValue);
                            values[upperKey] = thisValue;
                            input.setValue(upperValue);
                            values[key] = upperValue;
                        };
                    };
                });
            };
            return input;
        };

        private createValuesFromDVQueryContainer(parentContainer: HTMLDivElement): HTMLDivElement {
            const valuesFromDVQueryTopContainer = parentContainer.createDiv({ cls: "vstacked" })
            valuesFromDVQueryTopContainer.createEl("span", { text: "Dataview function" });
            valuesFromDVQueryTopContainer.createEl("span", { text: "Dataview query returning a list of string (<dv> object is available)", cls: "sub-text" });
            const valuesFromDVQueryContainer = valuesFromDVQueryTopContainer.createDiv({ cls: "field-container" })
            const valuesFromDVQuery = new TextAreaComponent(valuesFromDVQueryContainer);
            valuesFromDVQuery.inputEl.addClass("full-width");
            valuesFromDVQuery.inputEl.cols = 65;
            valuesFromDVQuery.inputEl.rows = 8;
            valuesFromDVQuery.setPlaceholder("ex: dv.pages('#student').map(p => p.name)")
            valuesFromDVQuery.setValue(this.field.options.valuesFromDVQuery || "");
            valuesFromDVQuery.onChange((value) => {
                this.field.options.valuesFromDVQuery = value
            })
            return valuesFromDVQueryTopContainer;
        }

        private displaySelectedTypeContainer(optionContainers: Record<keyof typeof SourceType, HTMLDivElement>, value: keyof typeof SourceType) {
            Object.keys(optionContainers).forEach((key: keyof typeof SourceType) => {
                if (key === value) {
                    optionContainers[key].show()
                } else {
                    optionContainers[key].hide()
                }
            })
        }

        private createAddButton(valuesList: HTMLDivElement, valuesListBody: HTMLDivElement): void {
            const valuesListFooter = valuesList.createDiv();
            const addValue = valuesListFooter.createEl('button');
            addValue.type = 'button';
            addValue.textContent = 'Add a value';
            addValue.onClickEvent(async (evt: MouseEvent) => {
                evt.preventDefault();
                let newKeyNumber = 1;
                Object.keys(this.field.options.valuesList).forEach(key => {
                    if (parseInt(key) && parseInt(key) >= newKeyNumber) {
                        newKeyNumber = parseInt(key) + 1;
                    };
                });
                const newKey = newKeyNumber.toString();
                this.field.options.valuesList[newKey] = "";
                this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, newKey))
            });
            valuesList.createEl("hr");
        }

        private removePresetValue(key: string): void {
            let newValues: Record<string, string> = {};
            for (let _key in this.field.options.valuesList) {
                if (key !== _key) {
                    newValues[_key] = this.field.options.valuesList[_key];
                };
            };
            this.field.options.valuesList = newValues;
        };
    }

}

export interface IListBasedModal<T extends Target> extends IBaseValueModal<T> {
    addNewValueToSettings: () => Promise<void>
    inputEl: HTMLInputElement
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<IListBasedModal<Target>> {
    return class ValueModal extends SuggestModal<string> {
        public managedField: IFieldManager<Target>
        public addButton: ButtonComponent;
        public previousModal?: BaseValueModal<Target>
        public saved: boolean
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.containerEl.addClass("metadata-menu");
            const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
            inputContainer.appendChild(this.inputEl)
            this.containerEl.find(".prompt").prepend(inputContainer)
            cleanActions(this.containerEl, ".footer-actions")
            const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
            this.buildAddButton(inputContainer)
            this.buildFooterActions(footerActionsContainer)
        }

        public close(openPreviousModal: boolean = true): void {
            if (openPreviousModal) this.previousModal?.open()
            super.close()
        }

        public getOptionsList(): string[] {
            let values: string[] = [];
            if (Array.isArray(this.managedField.options)) {
                values = this.managedField.options;
            } else if (!this.managedField.options.sourceType) {
                values = Object.values(this.managedField.options);
            } else {
                const options = this.managedField.options as Options
                switch (options.sourceType) {
                    case "ValuesList":
                        values = Object.values(this.managedField.options.valuesList);
                        break;
                    case "ValuesListNotePath":
                        values = plugin.fieldIndex.valuesListNotePathValues
                            .get(this.managedField.options.valuesListNotePath) || [];
                        break;
                    case "ValuesFromDVQuery":
                        {
                            const dvApi = plugin.app.plugins.plugins.dataview?.api
                            if (dvApi) {
                                //TODO validate this is still working after adding fallback empty object
                                //values = new Function("dv", "current", `return ${this.field.options.valuesFromDVQuery}`)(dvApi, dvFile)
                                const dvFile = isSingleTargeted(this.managedField) ? dvApi.page(this.managedField.target.path) : {}
                                values = new Function("dv", "current", `return ${this.managedField.options.valuesFromDVQuery}`)(dvApi, dvFile || {})
                            } else {
                                values = []
                            }
                        }
                        break;
                    default:
                        values = [];
                        break;
                }
            }
            return values;
        }
        getSuggestions(query: string): string[] | Promise<string[]> {
            return this.getOptionsList()
        }
        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
        }
        onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
            this.managedField.value = item
            managedField.save()
        }

        async onAdd(): Promise<void> {
            throw Error("This class has to implement an onAdd method")
        }

        async addNewValueToSettings(): Promise<void> {
            const newValue = this.inputEl.value;
            const options = this.managedField.options as Options
            switch (options.sourceType) {
                case "ValuesList":
                    let newOptions: string[] | Record<string, string>
                    options.valuesList
                    newOptions = options.valuesList || {}
                    if (Array.isArray(newOptions)) {
                        newOptions = [...newOptions, newValue]
                    } else if (typeof newOptions === "object") {
                        newOptions[`${Object.keys(newOptions).length + 1}`] = newValue
                    }
                    this.managedField.options = newOptions
                    break;
                case "ValuesListNotePath":
                    const valuesFile = plugin.app.vault.getAbstractFileByPath((options as Options).valuesListNotePath);
                    if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                        const result = await plugin.app.vault.read(valuesFile)
                        plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                    }
                default:
                    break;
            }
        }

        buildAddButton(container: HTMLDivElement) {
            // addButton
            this.addButton = new ButtonComponent(container)
            this.addButton.setIcon("plus")
            this.addButton.onClick(async () => await this.onAdd())
            this.addButton.setCta();
            this.addButton.setTooltip("Add this value to this field settings")
            this.addButton.buttonEl.hide();
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
                await this.clearValues();
                this.close();
            })
            clearButton.buttonEl.addClass("danger")
            this.modalEl.appendChild(footerActionsContainer)

        }

        buildConfirm(footerActionsContainer: HTMLDivElement) { }

        async clearValues() {
            this.managedField.value = ""
            this.managedField.save()
        }
    }
}