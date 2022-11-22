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

    private createListNotePathContainer(container: HTMLDivElement, plugin: MetadataMenu): HTMLDivElement {
        const valuesListNotePathContainer = container.createDiv({ cls: "field-container" });
        valuesListNotePathContainer.createDiv({ text: `Path of the note`, cls: "label" });
        const input = new TextComponent(valuesListNotePathContainer);
        input.inputEl.addClass("full-width");
        input.inputEl.addClass("with-label");
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
        this.valuesPromptComponents.push(input)
        input.setValue(presetValue);
        input.onChange(value => {
            this.field.options.valuesList[key] = value;
            FieldSettingsModal.removeValidationError(input);
        });
        const valueRemoveButton = new ButtonComponent(valueContainer);
        valueRemoveButton.setIcon("trash")
            .onClick((evt: MouseEvent) => {
                evt.preventDefault;
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

    public validateValue(value: string): boolean {
        //todo : manage both raw links and dv Link objects
        return true
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

    public getOptionsList(dvFile: any = undefined): string[] {
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
                            values = new Function("dv", "current", `return ${this.field.options.valuesFromDVQuery}`)(dvApi, dvFile)
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
                    input,
                    "Values cannot contain a comma"
                );
                error = true;
            };
            if (input.inputEl.value == "" && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input,
                    "Values can't be null."
                );
                error = true;
            };
        });
        return !error
    }

    private createAddButton(valuesList: HTMLDivElement, valuesListBody: HTMLDivElement): void {
        const valuesListFooter = valuesList.createDiv();
        const addValue = valuesListFooter.createEl('button');
        addValue.type = 'button';
        addValue.textContent = 'Add a value';
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
            this.createValueContainer(valuesListBody, newKey)
        });
        valuesList.createEl("hr");
    }

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

    private displaySelectedTypeContainer(optionContainers: Record<keyof typeof selectValuesSource.Type, HTMLDivElement>, value: keyof typeof selectValuesSource.Type) {
        Object.keys(optionContainers).forEach((key: keyof typeof selectValuesSource.Type) => {
            if (key === value) {
                optionContainers[key].show()
            } else {
                optionContainers[key].hide()
            }
        })
    }

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        const sourceTypeContainer = container.createDiv({ cls: "field-container" });
        sourceTypeContainer.createDiv({ text: "Values source type", cls: "label" })
        sourceTypeContainer.createDiv({ cls: "spacer" });
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

        const valuesListNotePathContainer = this.createListNotePathContainer(container, plugin);
        const presetValuesFieldsContainer = this.createValuesListContainer(container);
        const valuesFromDVQueryContainer = this.createValuesFromDVQueryContainer(container);

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
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = "value-container"
        fieldContainer.appendChild(dv.el('span', p[this.field.name], attrs))
    }
}