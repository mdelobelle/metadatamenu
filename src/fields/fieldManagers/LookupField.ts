import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, TextComponent, DropdownComponent, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { SettingLocation } from "../FieldManager";
import { FieldManager } from "../FieldManager";
import * as Lookup from "src/types/lookupTypes";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { Status } from "src/types/lookupTypes";
import { FieldOptions } from "src/components/NoteFields";
import { updateLookups } from "src/commands/updateLookups";

export default class LookupField extends FieldManager {

    private lookupValidatorField: HTMLDivElement;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Lookup)
        this.showModalOption = false
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        if (!this.field.options.autoUpdate && this.field.options.autoUpdate !== undefined) {
            const f = this.plugin.fieldIndex;
            const id = `${file.path}__${this.field.name}`;
            let status: Status;
            status = f.fileLookupFieldsStatus.get(id) || Status.changed
            //fileLookupFieldLastOutputType is updated after fileClass change cache resolution so won't be triggered properly. 
            //we anticipate this change so that the update button appears
            if (
                f.fileLookupFieldLastOutputType.get(`${file.path}__related__${this.field.fileClassName}___${this.field.name}`) !==
                this.field.options.outputType
            ) status = Status.changed
            const icon = status === Status.changed ? "refresh-ccw" : "file-check"
            const action = () => { updateLookups(this.plugin, "single_command", { file: file, fieldName: this.field.name }) }
            if (LookupField.isMenu(location) && status === Status.changed) {
                location.addItem((item) => {
                    item.setTitle(`Update <${name}>`);
                    item.setIcon(icon);
                    item.onClick(action);
                    item.setSection("metadata-menu.fields");
                })
            } else if (LookupField.isSuggest(location) && status === Status.changed) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: action,
                    icon: icon
                });

            } else if (LookupField.isFieldOptions(location) && status === Status.changed) {
                location.addOption(icon, action, `Update ${name}'s value`);
            } else if (LookupField.isFieldOptions(location) && status === Status.upToDate) {
                location.addOption(icon, () => { }, `${name} is up to date`);
            }
        } else if (LookupField.isFieldOptions(location)) {
            location.addOption("server-cog", () => { }, `${name} is auto-updated`, "disabled");
        }
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {
        //no field modal, we include the field directly
        if (lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => { replaceValues(this.plugin, file, this.field.name, "") });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, file, this.field.name, "", lineNumber, inFrontmatter, after, asList, asComment) });
        };
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {

    }

    private displaySelectedOutputOptionContainer(optionContainers: [Array<keyof typeof Lookup.Type>, HTMLElement | undefined][], value: keyof typeof Lookup.Type) {
        optionContainers.forEach(options_set => {
            if (options_set[0].includes(value)) {
                options_set[1]?.show()
            } else {
                options_set[1]?.hide()
            }
        })
    }

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClicked = () => { }): void {
        const fileClassName = this.plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)?.fileClassName || "presetField"
        container.createDiv({ text: this.plugin.fieldIndex.fileLookupFieldLastValue.get(`${file.path}__related__${fileClassName}___${fieldName}`) })
    }

    private displaySelectedOutputWarningContainer(optionWarningContainer: HTMLDivElement, value: keyof typeof Lookup.Type) {
        [Lookup.Type.LinksBulletList.toString(), Lookup.Type.CustomBulletList.toString()].includes(value) ?
            optionWarningContainer.show() : optionWarningContainer.hide();
    }

    private createLookupContainer(parentContainer: HTMLDivElement): void {

        const autoUpdateContainer = parentContainer.createDiv();
        autoUpdateContainer.createEl("span", { text: "Auto update this field ", cls: 'metadata-menu-field-option' });
        autoUpdateContainer.createEl("span", { text: "This could lead to latencies depending on the queries", cls: 'metadata-menu-field-option-subtext warning' });
        const autoUpdate = new ToggleComponent(autoUpdateContainer);
        if (this.field.options.autoUpdate === undefined) this.field.options.autoUpdate = true
        autoUpdate.setValue(this.field.options.autoUpdate);
        autoUpdate.onChange(value => {
            this.field.options.autoUpdate = value
        })



        const dvQueryStringContainer = parentContainer.createDiv();
        dvQueryStringContainer.createEl("span", { text: "Pages to look for in your vault (DataviewJS Query)", cls: 'metadata-menu-field-option' });
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

        const outputWarningContainer = parentContainer.createDiv();
        outputWarningContainer.createEl("p", {
            text:
                "Warning: this may override some lines under your list. " +
                "There shouldn't be an extra manual item in the list that is automatically " +
                "rendered by this field: it would be overriden after each field indexing",
            cls: "metadata-menu-field-option-warning"
        });

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

        const optionContainers: [Array<keyof typeof Lookup.Type>, HTMLElement | undefined][] = [
            [["LinksList", "LinksBulletList"], undefined],
            [["BuiltinSummarizing"], builtinOptionsContainer],
            [["CustomList", "CustomBulletList"], outputRenderingFunctionContainer],
            [["CustomSummarizing"], outputSummarizingFunctionContainer]
        ]

        this.displaySelectedOutputOptionContainer(optionContainers, outputTypeList.getValue() as keyof typeof Lookup.Type)
        this.displaySelectedOutputWarningContainer(outputWarningContainer, outputTypeList.getValue() as keyof typeof Lookup.Type)

        outputTypeList.onChange((value: keyof typeof Lookup.Type) => {
            this.field.options.outputType = value;
            this.displaySelectedOutputOptionContainer(optionContainers, value)
            this.displaySelectedOutputWarningContainer(outputWarningContainer, value)
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.lookupValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createLookupContainer(this.lookupValidatorField)
        this.lookupValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    getOptionsStr(): string {
        const shortDescription = Lookup.ShortDescription[this.field.options.outputType as Lookup.Type]
        let complement: string = ""
        if (this.field.options.outputType === Lookup.Type.BuiltinSummarizing) {
            complement = ` ${this.field.options.builtinSummarizingFunction}` +
                `${this.field.options.builtinSummarizingFunction !== Lookup.BuiltinSummarizing.CountAll ? " " + this.field.options.summarizedFieldName : ""}`
        }
        return shortDescription + complement
    }

    validateOptions(): boolean {
        return true
    }
}