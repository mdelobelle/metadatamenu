import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, TextComponent, DropdownComponent, Notice } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldType } from "src/types/fieldTypes";
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

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): Promise<void> {
        //no field modal, we include the field directly
        if (lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => { replaceValues(this.plugin, file, this.field.name, "") });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, file, this.field.name, "", lineNumber, inFrontmatter, after) });
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

    private displaySelectedOutputWarningContainer(optionWarningContainer: HTMLDivElement, value: keyof typeof Lookup.Type) {
        [Lookup.Type.LinksBulletList.toString(), Lookup.Type.CustomBulletList.toString()].includes(value) ?
            optionWarningContainer.show() : optionWarningContainer.hide();
    }

    private createLookupContainer(parentContainer: HTMLDivElement): void {

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

export async function updateLookups(plugin: MetadataMenu, force_update: boolean = false, source: string = ""): Promise<void> {
    //console.log("start update lookups [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    let renderingErrors: string[] = []
    for (let id of f.fileLookupFiles.keys()) {
        const [filePath, fieldName] = id.split("__related__")
        const tFile = plugin.app.vault.getAbstractFileByPath(filePath) as TFile
        if (tFile) {
            let newValue = "";
            const pages = f.fileLookupFiles.get(id)
            const field = f.filesFields.get(filePath)?.find(field => field.name == fieldName)
            switch (field?.options.outputType) {
                case Lookup.Type.LinksList:
                case Lookup.Type.LinksBulletList:
                    {
                        const newValuesArray = pages?.map((dvFile: any) => {
                            return FieldManager.buildMarkDownLink(plugin, tFile, dvFile.file.path);
                        });
                        newValue = (newValuesArray || []).join(", ");
                    }
                    break
                case Lookup.Type.CustomList:
                case Lookup.Type.CustomBulletList:
                    {
                        const renderingFunction = new Function("page", `return ${field.options.customListFunction}`)
                        const newValuesArray = pages?.map((dvFile: any) => {
                            try {
                                return renderingFunction(dvFile)
                            } catch {
                                if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                                return ""
                            }
                        })
                        newValue = (newValuesArray || []).join(", ");
                    }
                    break
                case Lookup.Type.CustomSummarizing:
                    {
                        const customSummarizingFunction = field.options.customSummarizingFunction

                        const summarizingFunction = new Function("pages",
                            customSummarizingFunction
                                .replace(/\{\{summarizedFieldName\}\}/g, field.options.summarizedFieldName))
                        try {
                            newValue = summarizingFunction(pages).toString();
                        } catch {
                            if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                            newValue = ""
                        }
                    }
                    break
                case Lookup.Type.BuiltinSummarizing:
                    {
                        const builtinFunction = field.options.builtinSummarizingFunction as keyof typeof Lookup.BuiltinSummarizing
                        const summarizingFunction = new Function("pages",
                            Lookup.BuiltinSummarizingFunction[builtinFunction]
                                .replace(/\{\{summarizedFieldName\}\}/g, field.options.summarizedFieldName))
                        try {
                            newValue = summarizingFunction(pages).toString();
                        } catch {
                            if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                            newValue = ""
                        }
                    }
                    break
                default:
                    break
            }
            //check if value has changed in order not to create an infinite loop
            const currentValue = f.fileLookupFieldLastValue.get(id)
            if (force_update || (!currentValue && newValue !== "") || currentValue !== newValue) {
                const previousValuesCount = plugin.fieldIndex.previousFileLookupFilesValues.get(tFile.path + "__related__" + fieldName) || 0
                await plugin.fileTaskManager.pushTask(() => replaceValues(plugin, tFile, fieldName, newValue, previousValuesCount));
                //await replaceValues(plugin, tFile, fieldName, newValue);
                f.fileLookupFieldLastValue.set(id, newValue)
            } else if (source !== "full Index") {
                plugin.fieldIndex.fileChanged = false
            }
        }
    }
    if (renderingErrors.length) new Notice(`Those fields have incorrect output rendering functions:\n${renderingErrors.join(",\n")}`)
    //console.log("finished update lookups [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
}

export function resolveLookups(plugin: MetadataMenu, source: string = ""): void {
    const f = plugin.fieldIndex;
    Array.from(f.filesFields).forEach((value: [string, Field[]]) => {
        const [filePath, fields] = value;
        const dvPage = f.dv.api.page(filePath);
        if (dvPage) {
            fields.filter(field => field.type === FieldType.Lookup && Object.keys(dvPage).includes(field.name)).forEach(lookupField => {
                const queryRelatedDVFiles = (new Function("dv", `return ${lookupField.options.dvQueryString}`))(f.dv.api).values as Array<any>
                const fileRelatedDVFiles = queryRelatedDVFiles.filter(dvFile => {
                    const targetValue = dvFile[lookupField.options.targetFieldName];
                    if (Array.isArray(targetValue)) {
                        return targetValue.filter(v => f.dv.api.value.isLink(v)).map(v => v.path).includes(filePath)
                    } else {
                        return targetValue?.path === filePath
                    }
                })
                const existingFileLookupFields = f.fileLookupFiles.get(`${filePath}__related__${lookupField.name}`)
                f.fileLookupFiles.set(`${filePath}__related__${lookupField.name}`, fileRelatedDVFiles)
                f.previousFileLookupFilesValues.set(`${filePath}__related__${lookupField.name}`, (existingFileLookupFields || fileRelatedDVFiles).length)
                fileRelatedDVFiles.forEach(dvFile => {
                    const parents = f.fileLookupParents.get(dvFile.file.path) || []
                    if (!parents.includes(filePath)) parents.push(filePath)
                    f.fileLookupParents.set(dvFile.file.path, parents)
                })
            })
        }
    })
    for (let id of f.fileLookupFiles.keys()) {
        const [filePath, fieldName] = id.split("__related__")
        const dvPage = f.dv.api.page(filePath);
        if (dvPage === undefined) {
            for (const file in f.fileLookupParents.keys()) {
                const newParents = f.fileLookupParents.get(file)?.remove(filePath) || []
                f.fileLookupParents.set(file, newParents);
            }
            f.fileLookupFiles.delete(id);
            f.fileLookupFieldLastValue.delete(id);
            f.previousFileLookupFilesValues.delete(id)
        } else if (dvPage[fieldName] === undefined) {
            f.fileLookupFiles.delete(id);
            f.fileLookupFieldLastValue.delete(id);
            f.previousFileLookupFilesValues.delete(id)
        }
    }
}