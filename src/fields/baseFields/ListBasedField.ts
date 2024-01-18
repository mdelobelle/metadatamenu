import { ButtonComponent, DropdownComponent, TextAreaComponent, TextComponent, setIcon } from "obsidian"
import { FieldBase, FieldType, Options } from "../BaseField"
import { ISettingsModal } from "../BaseSetting"
import { IManagedField, Target, listBasedModal, isSingleTargeted, removeValidationError } from "../Field"
import { FileSuggest } from "src/suggester/FileSuggester"
import { Constructor } from "../Fields"

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

export interface ListBasedOptions extends Options {
    valuesNotePath?: string
    values?: Record<string, string>
    dvQuery?: string
    source: "valuesNotePath" | "values" | "dvQuery"
}

export function listBaseSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class ListBaseSettingsModal extends Base {
        private valuesPromptComponents: TextComponent[] = []
        createSettingContainer = () => {
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

export abstract class ListBase extends FieldBase {
    type = FieldType.Select
    tagName = "select"
    icon = "arrow"
    modalBuilder = listBasedModal
}