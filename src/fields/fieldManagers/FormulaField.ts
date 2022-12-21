import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldType, FieldIcon } from "src/types/fieldTypes";
import Field from "../Field";
import { SettingLocation } from "../FieldManager";
import { FieldManager } from "../FieldManager";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { Status } from "src/types/lookupTypes";
import { FieldOptions } from "src/components/NoteFields";
import { updateFormulas } from "src/commands/updateFormulas";

export default class FormulaField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Formula)
        this.showModalOption = false
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const f = this.plugin.fieldIndex;
        const id = `${file.path}__${this.field.name}`;
        let status: Status;
        status = f.fileFormulaFieldsStatus.get(id) || Status.changed
        const icon = status === Status.changed ? "refresh-ccw" : "file-check"
        const action = () => { updateFormulas(this.plugin, { file: file, fieldName: this.field.name }) };
        if (FormulaField.isMenu(location) && status === Status.changed) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(icon);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            })
        } else if (FormulaField.isSuggest(location) && status === Status.changed) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: icon
            });
        } else if (FormulaField.isFieldOptions(location) && status === Status.changed) {
            location.addOption(icon, action, `Update ${name}'s value`);
        } else if (FormulaField.isFieldOptions(location) && status === Status.upToDate) {
            location.addOption(icon, () => { }, `${name} is up to date`);
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

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClicked = () => { }): void {
        const fileClassName = this.plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)?.fileClassName || "presetField"
        container.createDiv({ text: this.plugin.fieldIndex.fileFormulaFieldLastValue.get(`${file.path}__calculated__${fileClassName}___${fieldName}`) })
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
        formulaTopContainer.createEl("span", { text: "current and pages variables are available`", cls: 'sub-text' });
        const formulaContainer = formulaTopContainer.createDiv({ cls: "field-container" });
        const formula = new TextAreaComponent(formulaContainer);
        formula.inputEl.addClass("full-width");
        formula.inputEl.cols = 50;
        formula.inputEl.rows = 4;
        formula.setValue(this.field.options.formula || "");
        formula.setPlaceholder("exampe: current.apple + current.bananas - 3");

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