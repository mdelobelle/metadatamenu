import MetadataMenu from "main"
import { DropdownComponent, TFile, TextAreaComponent, TextComponent, ToggleComponent } from "obsidian"
import { Status } from "src/types/lookupTypes"
import { Constructor } from "src/typings/types"
import { ActionLocation, IField, IFieldManager, Target, isFieldActions, isSingleTargeted, isSuggest, removeValidationError } from "../Field"
import { BaseOptions, IFieldBase } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import * as Lookup from "src/types/lookupTypes";
import { updateLookups } from "src/commands/updateLookups"
import { displayLinksOrText, getLinksOrTextString } from "src/utils/linksUtils"
import { resolveLookups } from "src/commands/resolveLookups"

export class Base implements IFieldBase {
    type = <const>"Lookup"
    tagName = "lookup"
    icon = "file-search"
    tooltip = "Accepts a lookup query"
    colorClass = "lookup"
}

export interface Options extends BaseOptions {
    autoUpdate: boolean
    dvQueryString: string
    targetFieldName: string
    outputType: keyof typeof Lookup.Type
    builtinSummarizingFunction: string
    customSummarizingFunction: string
    customListFunction: string
    summarizedFieldName: string
}
export interface DefaultedOptions extends Options { }

export const DefaultOptions: DefaultedOptions = {
    autoUpdate: false,
    dvQueryString: "",
    targetFieldName: "",
    outputType: Lookup.Type.LinksList,
    builtinSummarizingFunction: Lookup.Default.BuiltinSummarizing,
    customListFunction: Lookup.Default.CustomList,
    customSummarizingFunction: Lookup.Default.CustomSummarizing,
    summarizedFieldName: ""
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    return class InputSettingModal extends Base {
        createSettingContainer = () => {
            const container = this.optionsContainer
            const autoUpdateTopContainer = container.createDiv({ cls: "vstacked" });
            const autoUpdateContainer = autoUpdateTopContainer.createDiv({ cls: "field-container" })
            autoUpdateContainer.createEl("span", { text: "Auto update this field ", cls: 'label' });
            autoUpdateContainer.createDiv({ cls: "spacer" });
            const autoUpdate = new ToggleComponent(autoUpdateContainer);
            autoUpdateTopContainer.createEl("span", { text: "This could lead to latencies depending on the queries", cls: 'sub-text warning' });

            if (this.field.options.autoUpdate === undefined) this.field.options.autoUpdate = false
            autoUpdate.setValue(this.field.options.autoUpdate);
            autoUpdate.onChange(value => {
                this.field.options.autoUpdate = value
            })

            const dvQueryStringTopContainer = container.createDiv({ cls: "vstacked" });
            dvQueryStringTopContainer.createEl("span", { text: "Pages to look for in your vault (DataviewJS Query)", cls: 'label' });
            dvQueryStringTopContainer.createEl("span", { text: "DataviewJS query of the form `dv.pages(...)`", cls: 'sub-text' });
            const dvQueryStringContainer = dvQueryStringTopContainer.createDiv({ cls: "field-container" })
            const dvQueryString = new TextAreaComponent(dvQueryStringContainer);
            dvQueryString.inputEl.addClass("full-width");
            dvQueryString.inputEl.cols = 50;
            dvQueryString.inputEl.rows = 4;
            dvQueryString.setValue(this.field.options.dvQueryString || "");
            dvQueryString.setPlaceholder("exampe: dv.pages('#student')")

            dvQueryString.onChange(value => {
                this.field.options.dvQueryString = value;
                removeValidationError(dvQueryString);
            })

            const targetFieldTopContainer = container.createDiv({ cls: "vstacked" });
            const targetFieldContainer = targetFieldTopContainer.createDiv({ cls: "field-container" })
            targetFieldContainer.createEl("span", { text: "Name of the related field", cls: 'label' });
            const targetFieldName = new TextComponent(targetFieldContainer);
            targetFieldName.inputEl.addClass("full-width")
            targetFieldName.inputEl.addClass("with-label")
            targetFieldTopContainer.createEl("span", { text: "field in the target pages that contains a link to the page where this lookup field is", cls: 'sub-text' });
            targetFieldName.setValue(this.field.options.targetFieldName || "");
            targetFieldName.onChange(value => {
                this.field.options.targetFieldName = value;
                removeValidationError(targetFieldName)
            })

            //lookup type selector
            const outputTypeContainer = container.createDiv({ cls: "field-container" });
            this.field.options.outputType = this.field.options.outputType || Lookup.Type.LinksList
            outputTypeContainer.createEl("span", { text: "Type of output", cls: 'label' });
            outputTypeContainer.createDiv({ cls: "spacer" })
            const outputTypeList = new DropdownComponent(outputTypeContainer);
            Object.keys(Lookup.Type).forEach((outputType: keyof typeof Lookup.Type) => {
                outputTypeList.addOption(outputType, Lookup.Description[outputType])
            })
            outputTypeList.setValue(this.field.options.outputType)

            const outputWarningContainer = container.createDiv();
            outputWarningContainer.createEl("p", {
                text:
                    "Warning: this may override some lines under your list. " +
                    "There shouldn't be an extra manual item in the list that is automatically " +
                    "rendered by this field: it would be overriden after each field indexing",
                cls: "field-warning"
            });

            //Built in summarizng function options
            const builtinOptionsContainer = container.createDiv();
            const builtinSummarizeFunctionTopContainer = builtinOptionsContainer.createDiv({ cls: "vstacked" })
            const builtinSummarizeFunctionContainer = builtinSummarizeFunctionTopContainer.createDiv({ cls: "field-container" });
            this.field.options.builtinSummarizingFunction = this.field.options.builtinSummarizingFunction || Lookup.Default.BuiltinSummarizing
            builtinSummarizeFunctionContainer.createEl("span", { text: Lookup.OptionLabel.BuiltinSummarizing, cls: "label" });
            builtinSummarizeFunctionContainer.createDiv({ cls: "spacer" });
            const builtinSummarizeFunctionList = new DropdownComponent(builtinSummarizeFunctionContainer);
            Object.keys(Lookup.BuiltinSummarizing).forEach((builtinFunction: keyof typeof Lookup.BuiltinSummarizing) => {
                builtinSummarizeFunctionList.addOption(builtinFunction, Lookup.BuiltinSummarizing[builtinFunction])
            })
            const builtinOptionsDescriptionContainer = builtinSummarizeFunctionTopContainer.createDiv({ cls: "sub-text" });
            const builtinFunction = this.field.options.builtinSummarizingFunction as keyof typeof Lookup.BuiltinSummarizing
            builtinOptionsDescriptionContainer.setText(Lookup.BuiltinSummarizingFunctionDescription[builtinFunction].replace("{{summarizedFieldName}}", this.field.options.summarizedFieldName))

            builtinSummarizeFunctionList.setValue(this.field.options.builtinSummarizingFunction)
            builtinSummarizeFunctionList.onChange((value: keyof typeof Lookup.BuiltinSummarizing) => {
                this.field.options.builtinSummarizingFunction = value
                builtinOptionsDescriptionContainer.setText(Lookup.BuiltinSummarizingFunctionDescription[value].replace("{{summarizedFieldName}}", this.field.options.summarizedFieldName))
            })

            const summarizedFieldNameTopContainer = builtinOptionsContainer.createDiv({ cls: "vstacked" });
            this.field.options.summarizedFieldName = this.field.options.summarizedFieldName
            const summarizedFieldNameContainer = summarizedFieldNameTopContainer.createDiv({ cls: "field-container" })
            summarizedFieldNameContainer.createEl("span", { text: "Summarized field name", cls: "label" });
            const summarizedFieldName = new TextComponent(summarizedFieldNameContainer);
            summarizedFieldName.inputEl.addClass("full-width");
            summarizedFieldName.inputEl.addClass("with-label");
            summarizedFieldNameTopContainer.createEl("span", { text: "Name of the field containing summarized value used for the summarizing function", cls: "sub-text" });

            summarizedFieldName.setValue(this.field.options.summarizedFieldName)
            summarizedFieldName.onChange(value => {
                this.field.options.summarizedFieldName = value
            })

            // Custom list function options
            const outputRenderingFunctionTopContainer = container.createDiv({ cls: "vstacked" });
            this.field.options.customListFunction = this.field.options.customListFunction || Lookup.Default.CustomList
            outputRenderingFunctionTopContainer.createEl("span", { text: Lookup.OptionLabel.CustomList, cls: "label" });
            outputRenderingFunctionTopContainer.createEl("code", { text: Lookup.OptionSubLabel.CustomList });
            const outputRenderingFunctionContainer = outputRenderingFunctionTopContainer.createDiv({ cls: "field-container" })
            const outputRenderingFunction = new TextAreaComponent(outputRenderingFunctionContainer);
            outputRenderingFunction.inputEl.addClass("full-width");
            outputRenderingFunction.setPlaceholder(Lookup.Helper.CustomList)
            outputRenderingFunction.setValue(this.field.options.customListFunction)
            outputRenderingFunction.inputEl.cols = 65;
            outputRenderingFunction.inputEl.rows = 4;
            outputRenderingFunction.onChange(value => {
                this.field.options.customListFunction = value
            })

            const outputSummarizingFunctionTopContainer = container.createDiv({ cls: "vstacked" });
            this.field.options.customSummarizingFunction = this.field.options.customSummarizingFunction || Lookup.Default.CustomSummarizing
            outputSummarizingFunctionTopContainer.createEl("span", { text: Lookup.OptionLabel.CustomSummarizing, cls: "label" });
            outputSummarizingFunctionTopContainer.createEl("code", { text: Lookup.OptionSubLabel.CustomSummarizing });
            const outputSummarizingFunctionContainer = outputSummarizingFunctionTopContainer.createDiv({ cls: "field-container" })
            const outputSummarizingFunction = new TextAreaComponent(outputSummarizingFunctionContainer);
            outputSummarizingFunction.inputEl.addClass("full-width");
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
                [["CustomList", "CustomBulletList"], outputRenderingFunctionTopContainer],
                [["CustomSummarizing"], outputSummarizingFunctionTopContainer]
            ]

            this.displaySelectedOutputOptionContainer(optionContainers, outputTypeList.getValue() as keyof typeof Lookup.Type)
            this.displaySelectedOutputWarningContainer(outputWarningContainer, outputTypeList.getValue() as keyof typeof Lookup.Type)

            outputTypeList.onChange((value: keyof typeof Lookup.Type) => {
                this.field.options.outputType = value;
                this.displaySelectedOutputOptionContainer(optionContainers, value)
                this.displaySelectedOutputWarningContainer(outputWarningContainer, value)
            })

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

        private displaySelectedOutputWarningContainer(optionWarningContainer: HTMLDivElement, value: keyof typeof Lookup.Type) {
            [Lookup.Type.LinksBulletList.toString(), Lookup.Type.CustomBulletList.toString()].includes(value) ?
                optionWarningContainer.show() : optionWarningContainer.hide();
        }

        validateOptions(): boolean {
            return true
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    if (isSingleTargeted(managedField)) return getLinksOrTextString(managedField.value, managedField.target)
    else return ""
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked = () => { }) {
    if (isSingleTargeted(managedField)) displayLinksOrText(managedField.value, managedField.target, container, managedField.plugin, () => onClicked)
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath?: string): void {
    const name = field.name
    //if (!field.options.autoUpdate && field.options.autoUpdate !== undefined) {
    if (field.options.autoUpdate === false || !plugin.settings.isAutoCalculationEnabled) {
        const f = plugin.fieldIndex;
        const id = `${file.path}__${field.name}`;
        let status: Status;
        status = f.fileLookupFieldsStatus.get(id) as Status || Status.changed
        //fileLookupFieldLastOutputType is updated after fileClass change cache resolution so won't be triggered properly. 
        //we anticipate this change so that the update button appears
        if (
            f.fileLookupFieldLastOutputType.get(`${file.path}__related__${field.fileClassName}___${field.name}`) !==
            field.options.outputType
        ) status = Status.changed
        const icon = Lookup.statusIcon[status]
        const action = async () => {
            if (!plugin.settings.isAutoCalculationEnabled) resolveLookups(plugin)
            await updateLookups(plugin, { file: file, fieldName: field.name })
            f.applyUpdates()
        }
        if (isSuggest(location) && [Status.changed, Status.mayHaveChanged].includes(status)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: icon
            });

        } else if (isFieldActions(location) && [Status.changed, Status.mayHaveChanged].includes(status)) {
            location.addOption(`field_${field.id}_update`, icon, action, `Update ${name}'s value`);
        } else if (isFieldActions(location) && status === Status.upToDate) {
            location.addOption(`field_${field.id}_update`, icon, () => { }, `${name} is up to date`);
        }
    } else if (isFieldActions(location)) {
        location.addOption(`field_${field.id}_update`, "server-cog", () => { }, `${name} is auto-updated`, "disabled");
    }
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return true
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    if (!isSingleTargeted(managedField)) return
    const file = managedField.target
    const fieldName = managedField.name
    const fileClassName = managedField.plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)?.fileClassName || "presetField"
    const fieldValue = dv.el('span', managedField.plugin.fieldIndex.fileLookupFieldLastValue.get(`${file.path}__related__${fileClassName}___${fieldName}`), attrs);
    fieldContainer.appendChild(fieldValue);
}

export function getOptionsStr(field: IField<Options>): string {
    const shortDescription = Lookup.ShortDescription[field.options.outputType as Lookup.Type]
    let complement: string = ""
    if (field.options.outputType === Lookup.Type.BuiltinSummarizing) {
        complement = ` ${field.options.builtinSummarizingFunction}` +
            `${field.options.builtinSummarizingFunction !== Lookup.BuiltinSummarizing.CountAll ? " " + field.options.summarizedFieldName : ""}`
    }
    return shortDescription + complement
}