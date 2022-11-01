import MetadataMenu from "main";
import { TFile, Menu, TextAreaComponent, TextComponent, DropdownComponent, ToggleComponent } from "obsidian";
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

    private formulaValidatorField: HTMLDivElement;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Formula)
        this.showModalOption = false
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const action = () => { };
        if (FormulaField.isMenu(location) && status === Status.changed) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon.Formula);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            })
        } else if (FormulaField.isSuggest(location) && status === Status.changed) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon.Formula
            });

        } else if (FormulaField.isFieldOptions(location)) {
            location.addOption(FieldIcon.Formula, () => { }, `${name} is automatically calculated`, "disabled");
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

    private createFormulaContainer(parentContainer: HTMLDivElement): void {

        const formulaContainer = parentContainer.createDiv();
        formulaContainer.createEl("span", { text: "javascript formula", cls: 'metadata-menu-field-option' });
        formulaContainer.createEl("span", { text: "current and pages variables are available`", cls: 'metadata-menu-field-option-subtext' });
        const formula = new TextAreaComponent(formulaContainer);
        formula.inputEl.cols = 50;
        formula.inputEl.rows = 4;
        formula.setValue(this.field.options.formula || "");
        formula.setPlaceholder("exampe: current.apple + current.bananas - 3")

        formula.onChange(value => {
            this.field.options.formula = value;
            FieldSettingsModal.removeValidationError(formula);
        })
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.formulaValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createFormulaContainer(this.formulaValidatorField)
        this.formulaValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    getOptionsStr(): string {
        return this.field.options.formula
    }

    validateOptions(): boolean {
        return true
    }
}