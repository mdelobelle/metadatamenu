import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, TextComponent, DropdownComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { SettingLocation } from "../FieldManager";
import { FieldManager } from "../FieldManager";
import * as Lookup from "src/types/lookupTypes";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";

export default class LookupField extends FieldManager {

    private lookupValidatorField: HTMLDivElement;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Lookup)
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {

    }

    createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        //no field modal, we include the field directly
        if (lineNumber == -1) {
            replaceValues(this.plugin, file, this.field.name, "");
        } else {
            insertValues(this.plugin, file, this.field.name, "", lineNumber, inFrontmatter, after);
        };
        //this.plugin.fieldIndex.fullIndex("insert", true);
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {

    }

    private displaySelectedOutputOptionContainer(optionContainers: Record<string, HTMLElement | undefined>, value: string) {
        Object.keys(optionContainers).forEach(option => {
            if (value === option) {
                optionContainers[option]?.show()
            } else {
                optionContainers[option]?.hide()
            }
        })
    }

    private createLookupContainer(parentContainer: HTMLDivElement): void {

        const dvQueryStringContainer = parentContainer.createDiv();
        dvQueryStringContainer.createEl("span", { text: "Pages to look for in your vault (Dataview Query)", cls: 'metadata-menu-field-option' });
        dvQueryStringContainer.createEl("span", { text: "DataviewJS query of the form `dv.pages(...)`", cls: 'metadata-menu-field-option-subtext' });
        const dvQueryString = new TextAreaComponent(dvQueryStringContainer);
        dvQueryString.inputEl.cols = 50;
        dvQueryString.inputEl.rows = 4;
        dvQueryString.setValue(this.field.options.dvQueryString || "");
        dvQueryString.setPlaceholder("exampe: dv.pages('#student')")

        dvQueryString.onChange(value => {
            this.field.options.dvQueryString = value;
            FieldSettingsModal.removeValidationError(dvQueryString);
        })

        const targetFieldContainer = parentContainer.createDiv();
        targetFieldContainer.createEl("span", { text: "Name of the related field", cls: 'metadata-menu-field-option' });
        targetFieldContainer.createEl("span", { text: "field in the target pages that contains a link to the page where this lookup field is", cls: 'metadata-menu-field-option-subtext' });
        const targetFieldName = new TextComponent(targetFieldContainer);
        targetFieldName.setValue(this.field.options.targetFieldName || "");
        targetFieldName.onChange(value => {
            this.field.options.targetFieldName = value;
            FieldSettingsModal.removeValidationError(targetFieldName)
        })

        //lookup type selector
        const outputTypeContainer = parentContainer.createDiv();
        this.field.options.outputType = this.field.options.outputType || Lookup.Type.LinksList
        outputTypeContainer.createEl("span", { text: "Type of output", cls: 'metadata-menu-field-option' });
        const outputTypeList = new DropdownComponent(outputTypeContainer);
        Object.keys(Lookup.Type).forEach((outputType: keyof typeof Lookup.Type) => {
            outputTypeList.addOption(outputType, Lookup.Description[outputType])
        })
        outputTypeList.setValue(this.field.options.outputType)

        //Built in summarizng function options
        const builtinOptionsContainer = parentContainer.createDiv();
        const builtinSummarizeFunctionContainer = builtinOptionsContainer.createDiv();
        this.field.options.builtinSummarizingFunction = this.field.options.builtinSummarizingFunction || Lookup.Default.BuiltinSummarizing
        builtinSummarizeFunctionContainer.createEl("span", { text: Lookup.OptionLabel.BuiltinSummarizing, cls: "metadata-menu-field-option" });
        const builtinSummarizeFunctionList = new DropdownComponent(builtinSummarizeFunctionContainer);
        Object.keys(Lookup.BuiltinSummarizing).forEach((builtinFunction: keyof typeof Lookup.BuiltinSummarizing) => {
            builtinSummarizeFunctionList.addOption(builtinFunction, Lookup.BuiltinSummarizing[builtinFunction])
        })

        const builtinOptionsDescriptionContainer = builtinOptionsContainer.createDiv({ cls: "metadata-menu-field-option-subtext" });
        const builtinFunction = this.field.options.builtinSummarizingFunction as keyof typeof Lookup.BuiltinSummarizing
        builtinOptionsDescriptionContainer.setText(Lookup.BuiltinSummarizingFunctionDescription[builtinFunction].replace("{{summarizedFieldName}}", this.field.options.summarizedFieldName))

        builtinSummarizeFunctionList.setValue(this.field.options.builtinSummarizingFunction)
        builtinSummarizeFunctionList.onChange((value: keyof typeof Lookup.BuiltinSummarizing) => {
            this.field.options.builtinSummarizingFunction = value
            builtinOptionsDescriptionContainer.setText(Lookup.BuiltinSummarizingFunctionDescription[value].replace("{{summarizedFieldName}}", this.field.options.summarizedFieldName))
        })

        const summarizedFieldNameContainer = builtinOptionsContainer.createDiv();
        this.field.options.summarizedFieldName = this.field.options.summarizedFieldName
        summarizedFieldNameContainer.createEl("span", { text: "Summarized field name", cls: "metadata-menu-field-option" });
        summarizedFieldNameContainer.createEl("span", { text: "Name of the field containing summarized value used for the summarizing function", cls: "metadata-menu-field-option-subtext" });
        const summarizedFieldName = new TextComponent(summarizedFieldNameContainer);
        summarizedFieldName.setValue(this.field.options.summarizedFieldName)
        summarizedFieldName.onChange(value => {
            this.field.options.summarizedFieldName = value
        })

        // Custom list function options
        const outputRenderingFunctionContainer = parentContainer.createDiv();
        this.field.options.customListFunction = this.field.options.customListFunction || Lookup.Default.CustomList
        outputRenderingFunctionContainer.createEl("span", { text: Lookup.OptionLabel.CustomList, cls: "metadata-menu-field-option" });
        outputRenderingFunctionContainer.createEl("code", { text: Lookup.OptionSubLabel.CustomList, cls: "metadata-menu-field-option-subtext" })
        const outputRenderingFunction = new TextAreaComponent(outputRenderingFunctionContainer);
        outputRenderingFunction.setPlaceholder(Lookup.Helper.CustomList)
        outputRenderingFunction.setValue(this.field.options.customListFunction)
        outputRenderingFunction.inputEl.cols = 65;
        outputRenderingFunction.inputEl.rows = 4;
        outputRenderingFunction.onChange(value => {
            this.field.options.customListFunction = value
        })

        const outputSummarizingFunctionContainer = parentContainer.createDiv();
        this.field.options.customSummarizingFunction = this.field.options.customSummarizingFunction || Lookup.Default.CustomSummarizing
        outputSummarizingFunctionContainer.createEl("span", { text: Lookup.OptionLabel.CustomSummarizing, cls: "metadata-menu-field-option" });
        outputSummarizingFunctionContainer.createEl("code", { text: Lookup.OptionSubLabel.CustomSummarizing, cls: "metadata-menu-field-option-subtext" })
        const outputSummarizingFunction = new TextAreaComponent(outputSummarizingFunctionContainer);
        outputSummarizingFunction.setPlaceholder(Lookup.Helper.CustomSummarizing)
        outputSummarizingFunction.setValue(this.field.options.customSummarizingFunction)
        outputSummarizingFunction.inputEl.cols = 65;
        outputSummarizingFunction.inputEl.rows = 8;
        outputSummarizingFunction.onChange(value => {
            this.field.options.customSummarizingFunction = value
        })

        const optionContainers: Record<keyof typeof Lookup.Type, HTMLElement | undefined> = {
            "LinksList": undefined,
            "BuiltinSummarizing": builtinOptionsContainer,
            "CustomList": outputRenderingFunctionContainer,
            "CustomSummarizing": outputSummarizingFunctionContainer
        }

        this.displaySelectedOutputOptionContainer(optionContainers, outputTypeList.getValue())

        outputTypeList.onChange(value => {
            this.field.options.outputType = value;
            this.displaySelectedOutputOptionContainer(optionContainers, value)
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.lookupValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createLookupContainer(this.lookupValidatorField)
        this.lookupValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    getOptionsStr(): string {
        return ""
    }

    validateOptions(): boolean {
        return true
    }
}