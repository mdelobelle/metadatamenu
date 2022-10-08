import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import { TextComponent, ButtonComponent, setIcon, DropdownComponent, TextAreaComponent } from "obsidian";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import MetadataMenu from "main";
import { FileSuggest } from "src/suggester/FileSuggester";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"

export default abstract class AbstractListBasedField extends FieldManager {

    abstract valuesPromptComponents: Array<TextComponent>;

    constructor(plugin: MetadataMenu, field: Field, type: FieldType) {
        super(plugin, field, type)
    }

    //Settings
    private setValueListText(header: HTMLDivElement): void {
        header.setText(`Preset options: ${Object.values(this.field.options.valuesList).join(', ')}`);
    };

    private createListNotePathContainer(parentNode: HTMLDivElement, plugin: MetadataMenu): HTMLDivElement {
        const valuesListNotePathContainer = parentNode.createDiv({});
        const listNoteContainerLabel = valuesListNotePathContainer.createDiv({ cls: "metadata-menu-setting-fileClass-search" });
        listNoteContainerLabel.setText(`Path of the note containing the values:`);

        const input = new TextComponent(valuesListNotePathContainer);

        new FileSuggest(
            input.inputEl,
            plugin,
            "/"
        )
        const listNotePath = this.field.options.valuesListNotePath;
        input.setValue(listNotePath || "");
        input.setPlaceholder("Path/of/the/note.md");
        input.onChange(value => this.field.options.valuesListNotePath = value);
        return valuesListNotePathContainer;
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

    private createValuesListContainer(parentContainer: HTMLDivElement): HTMLDivElement {
        const presetValuesFields = parentContainer.createDiv()
        const valuesList = presetValuesFields.createDiv();
        const valuesListHeader = valuesList.createDiv({ cls: "metadata-menu-field-option" });
        valuesListHeader.createEl("h2");
        valuesListHeader.setText(`Preset options: ${Object.values(this.field.options.valuesList).join(', ')}`);
        const valuesListBody = valuesList.createDiv();
        Object.keys(this.field.options.valuesList).forEach(key => {
            this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, valuesListHeader, key));
        });
        this.createAddButton(valuesList, valuesListBody, valuesListHeader)
        return presetValuesFields;
    }

    private createValueContainer(parentNode: HTMLDivElement, header: HTMLDivElement, key: string): TextComponent {
        const values = this.field.options.valuesList || {};
        const presetValue = values[key];
        const valueContainer = parentNode.createDiv({
            cls: 'metadata-menu-prompt-container',
        });
        const input = new TextComponent(valueContainer);
        this.valuesPromptComponents.push(input)
        input.setValue(presetValue);
        input.onChange(value => {
            this.field.options.valuesList[key] = value;
            this.setValueListText(header);
            FieldSettingsModal.removeValidationError(input);
        });
        const valueRemoveButton = new ButtonComponent(valueContainer);
        valueRemoveButton.setIcon("trash")
            .onClick((evt: MouseEvent) => {
                evt.preventDefault;
                this.removePresetValue(key);
                this.setValueListText(header);
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

    public validateValue(value: string): boolean {
        if (this.field.options.valuesList && Object.values(this.field.options.valuesList).length > 0) {
            if (value) {
                return Object.values(this.field.options).includes(value.trim())
            } else {
                return true;
            }

        } else if (this.field.options.valuesListNotePath) {
            const listNoteValues = this.plugin.fieldIndex.valuesListNotePathValues.get(this.field.options.valuesListNotePath)
            return listNoteValues !== undefined ? listNoteValues.contains(value.trim()) : false
        } else {
            return false
        }
    }

    public getOptionsStr(): string {
        switch (this.field.options.sourceType) {
            case selectValuesSource.Type.ValuesList:
                return Object.values(this.field.options.valuesList).join(", ");
            case selectValuesSource.Type.ValuesListNotePath:
                return this.field.options.valuesListNotePath
            case selectValuesSource.Type.ValuesFromDVQuery:
                return this.field.options.valuesFromDVQuery
            default:
                return ""

        }
    }

    public getOptionsList(): string[] {
        let values: string[] = [];
        if (Array.isArray(this.field.options)) {
            values = this.field.options;
        } else if (!this.field.options.sourceType) {
            values = Object.values(this.field.options);
        } else {
            switch (this.field.options.sourceType) {
                case selectValuesSource.Type.ValuesList:
                    values = Object.values(this.field.options.valuesList);
                    break;
                case selectValuesSource.Type.ValuesListNotePath:
                    values = this.plugin.fieldIndex.valuesListNotePathValues
                        .get(this.field.options.valuesListNotePath) || [];
                    break;
                case selectValuesSource.Type.ValuesFromDVQuery:
                    {
                        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
                        if (dvApi) {
                            values = new Function("dv", `return ${this.field.options.valuesFromDVQuery}`)(dvApi)
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

    public validateOptions(): boolean {
        let error = false;
        this.valuesPromptComponents.forEach(input => {
            if (/[,]/gu.test(input.inputEl.value) && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input, input.inputEl.parentElement.lastElementChild,
                    "Values cannot contain a comma"
                );
                error = true;
            };
            if (input.inputEl.value == "" && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input, input.inputEl.parentElement.lastElementChild,
                    "Values can't be null."
                );
                error = true;
            };
        });
        return !error
    }

    private createAddButton(valuesList: HTMLDivElement, valuesListBody: HTMLDivElement, valuesListHeader: HTMLDivElement): void {
        const valuesListFooter = valuesList.createDiv();
        const addValue = valuesListFooter.createEl('button');
        addValue.type = 'button';
        addValue.textContent = 'Add';
        addValue.onClickEvent(async (evt: MouseEvent) => {
            evt.preventDefault;

            let newKeyNumber = 1;
            Object.keys(this.field.options.valuesList).forEach(key => {
                if (parseInt(key) && parseInt(key) >= newKeyNumber) {
                    newKeyNumber = parseInt(key) + 1;
                };
            });
            const newKey = newKeyNumber.toString();
            this.field.options.valuesList[newKey] = "";
            this.createValueContainer(valuesListBody, valuesListHeader, newKey)
        });
        valuesList.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    private createValuesFromDVQueryContainer(parentContainer: HTMLDivElement): HTMLDivElement {
        const valuesFromDVQueryContainer = parentContainer.createDiv({})
        valuesFromDVQueryContainer.createEl("span", { text: "Dataview function", cls: "metadata-menu-field-option" });
        valuesFromDVQueryContainer.createEl("span", { text: "Dataview query returning a list of string (dv attribute is available)", cls: "metadata-menu-field-option-subtext" });
        const valuesFromDVQuery = new TextAreaComponent(valuesFromDVQueryContainer);
        valuesFromDVQuery.inputEl.cols = 65;
        valuesFromDVQuery.inputEl.rows = 8;
        valuesFromDVQuery.setPlaceholder("ex: dv.pages('#student').map(p => p.name)")
        valuesFromDVQuery.setValue(this.field.options.valuesFromDVQuery || "");
        valuesFromDVQuery.onChange((value) => {
            this.field.options.valuesFromDVQuery = value
        })
        return valuesFromDVQueryContainer;
    }

    private displaySelectedTypeContainer(optionContainers: Record<keyof typeof selectValuesSource.Type, HTMLDivElement>, value: keyof typeof selectValuesSource.Type) {
        Object.keys(optionContainers).forEach((key: keyof typeof selectValuesSource.Type) => {
            if (key === value) {
                optionContainers[key].show()
            } else {
                optionContainers[key].hide()
            }
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        //structure:
        //selecteur de type avec defautl sur valuesList
        //valuesContainer qui display le bon input en fonction de la valeur de valuesTypeSelect
        const sourceTypeContainer = parentContainer.createDiv();
        sourceTypeContainer.createDiv({ text: "Select the source of values for this field", cls: "metadata-menu-field-option" })
        const sourceType = new DropdownComponent(sourceTypeContainer);
        //manage new field and fileClass legacy field
        if (!this.field.options.sourceType) {
            //this is a new field or fileClass legacy field
            if (typeof this.field.options === "object" && Object.keys(this.field.options).every(key => !isNaN(parseInt(key)))) {
                //this is a fileClass legacy field
                const valuesList: Record<string, string> = {}
                Object.keys(this.field.options).forEach((key: string) => valuesList[key] = this.field.options[key]);
                this.field.options = {}
                this.field.options.valuesList = valuesList;
            } else {
                this.field.options = {}
            }
            this.field.options.sourceType = selectValuesSource.Type.ValuesList;
            this.field.options.valuesListNotePath = "";
            this.field.options.valuesFromDVQuery = "";
        }
        Object.keys(selectValuesSource.Type).forEach((option: keyof typeof selectValuesSource.Type) => sourceType.addOption(option, selectValuesSource.typeDisplay[option]))
        sourceType.setValue(this.field.options.sourceType || selectValuesSource.Type.ValuesList)

        const valuesListNotePathContainer = this.createListNotePathContainer(parentContainer, plugin);
        const presetValuesFieldsContainer = this.createValuesListContainer(parentContainer);
        const valuesFromDVQueryContainer = this.createValuesFromDVQueryContainer(parentContainer);

        const valuesContainers: Record<keyof typeof selectValuesSource.Type, HTMLDivElement> = {
            "ValuesList": presetValuesFieldsContainer,
            "ValuesListNotePath": valuesListNotePathContainer,
            "ValuesFromDVQuery": valuesFromDVQueryContainer
        }

        sourceType.onChange((value: keyof typeof selectValuesSource.Type) => {
            this.field.options.sourceType = value;
            this.displaySelectedTypeContainer(valuesContainers, value)
        })

        this.displaySelectedTypeContainer(valuesContainers, this.field.options.sourceType)
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): void {
        const fieldValue = dv.el("span", p[this.field.name]);
        fieldContainer.appendChild(fieldValue);
    }
}