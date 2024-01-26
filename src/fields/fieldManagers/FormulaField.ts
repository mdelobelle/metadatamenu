import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldType, FieldIcon } from "src/types/fieldTypes";
import Field from "../_Field";
import { SettingLocation } from "../FieldManager";
import { FieldManager } from "../FieldManager";
import { Status, statusIcon } from "src/types/lookupTypes";
import { FieldOptions } from "src/components/FieldsModal";
import { updateFormulas } from "src/commands/updateFormulas";
import { ExistingField } from "../ExistingField";

export default class FormulaField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Formula)
        this.showModalOption = false
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name;
        const f = this.plugin.fieldIndex;
        const id = `${file.path}__${name}`;
        const status = f.fileFormulaFieldsStatus.get(id) || Status.changed
        if (!this.field.options.autoUpdate && this.field.options.autoUpdate !== undefined) {
            const action = async () => {
                await updateFormulas(this.plugin, { file: file, fieldName: name })
                f.applyUpdates()
            };
            const icon = statusIcon[status]
            if (FormulaField.isSuggest(location) && [Status.changed, Status.mayHaveChanged].includes(status)) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: action,
                    icon: icon
                });
            } else if (FormulaField.isFieldOptions(location) && [Status.changed, Status.mayHaveChanged].includes(status)) {
                location.addOption(icon, action, `Update ${name}'s value`);
            } else if (FormulaField.isFieldOptions(location) && status === Status.upToDate) {
                location.addOption(icon, () => { }, `${name} is up to date`);
            } else if (FormulaField.isFieldOptions(location) && status === Status.error) {
                location.addOption(icon, () => { }, `${name} has an error`);
            }
        } else if (FormulaField.isFieldOptions(location)) {
            const icon = status === Status.error ? statusIcon['error'] : "server-cog"
            location.addOption(icon, () => { }, `${name} is auto-updated`, "disabled");
        }
    }

    async createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean
    ): Promise<void> {
        await this.plugin.fieldIndex.fullIndex()
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        fieldContainer.appendChild(fieldValue);
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: string, onClicked = () => { }): void {
        const fileClassName = this.plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.id === this.field.id)?.fileClassName || "presetField"
        container.createDiv({ text: this.plugin.fieldIndex.fileFormulaFieldLastValue.get(`${file.path}__calculated__${fileClassName}___${this.field.name}`) })
    }

    private createFormulaContainer(container: HTMLDivElement): void {
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

        const formulaTopContainer = container.createDiv({ cls: "vstacked" });
        formulaTopContainer.createEl("span", { text: "javascript formula", cls: 'label' });
        formulaTopContainer.createEl("span", { text: "current and dv variables are available", cls: 'sub-text' });
        const formulaContainer = formulaTopContainer.createDiv({ cls: "field-container" });
        const formula = new TextAreaComponent(formulaContainer);
        formula.inputEl.addClass("full-width");
        formula.inputEl.cols = 50;
        formula.inputEl.rows = 4;
        formula.setValue(this.field.options.formula || "");
        formula.setPlaceholder("example: current.apple + current.bananas - 3");

        formula.onChange(value => {
            this.field.options.formula = value;
            FieldSettingsModal.removeValidationError(formula);
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.createFormulaContainer(parentContainer)
    }

    getOptionsStr(): string {
        return this.field.options.formula
    }

    validateOptions(): boolean {
        return true
    }
}