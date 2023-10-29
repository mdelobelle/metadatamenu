import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";
import { postValues } from "src/commands/postValues";
import { SettingLocation } from "../FieldManager";
import { ExistingField } from "../existingField";
import * as fieldsValues from 'src/db/stores/fieldsValues'
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";

export default class CycleField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Cycle)
        this.showModalOption = false;
    }

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        const allowNullValueContainer = container.createDiv({ cls: "field-container" });
        allowNullValueContainer.createDiv({ cls: "label", text: "Cycle begins by a null value" });
        allowNullValueContainer.createDiv({ cls: "spacer" });
        const allowNullToggler = new ToggleComponent(allowNullValueContainer);
        allowNullToggler.setValue(this.field.options.allowNull || false);
        allowNullToggler.onChange(value => this.field.options.allowNull = value);
        super.createSettingContainer(container, plugin, location);
    }

    public nextOption(rawValue: string): string {
        let nextOption: string;
        const values = this.getOptionsList();
        const value = !rawValue ? "" : rawValue.toString()
        if (values.indexOf(value) === -1) {
            nextOption = values[0] || ""
        } else {
            nextOption = values[(values.indexOf(value) + 1) % values.length]
        }
        return nextOption
    }

    public getOptionsList(): string[] {
        return this.field.options.allowNull ? ["", ...super.getOptionsList()] : super.getOptionsList();
    }

    private getRawOptionFromDuration(duration: any): string | undefined {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let matchedValue: string | undefined = undefined;
        if (dvApi && dvApi.value.isDuration(duration)) {
            this.getOptionsList().forEach(option => {
                const dvOption = dvApi.duration(option);
                if (Object.keys(duration.values).every(j =>
                    (!duration.values[j] && !dvOption.values[j]) || (duration.values[j] === dvOption.values[j])
                )) {
                    matchedValue = option
                }
            })
        }
        return matchedValue
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {

        let valueText: string;

        switch (value) {
            case undefined: valueText = ""; break;
            case null: valueText = ""; break;
            case false: valueText = "false"; break;
            case 0: valueText = "0"; break;
            default: valueText = value.toString() || "";
        }
        container.createDiv({ text: valueText })
        //container.createDiv({ text: this.getRawOptionFromDuration(valueText) || valueText })
    }

    public async next(name: string, file: TFile, indexedPath?: string): Promise<void> {
        const eF = await fieldsValues.getElementForIndexedPath<ExistingField>(this.plugin, file, indexedPath)
        const value = eF?.value || ""
        console.log("NEXTVALUE", value)
        //let matchedValue = this.getRawOptionFromDuration(value) || value;
        await postValues(this.plugin, [{ id: indexedPath || this.field.id, payload: { value: this.nextOption(value).toString() } }], file)
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const iconName = FieldIcon[FieldType.Cycle];
        const action = async () => this.next(name, file, indexedPath);
        if (CycleField.isSuggest(location)) {
            location.options.push({
                id: `cycle_${name}`,
                actionLabel: `<span>Cycle <b>${name}</b></span>`,
                action: action,
                icon: iconName
            })
        } else if (CycleField.isFieldOptions(location)) {
            location.addOption(iconName, action, `Cycle ${name}`);
        };
    };

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asComment?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): void {
        const fieldModal = new SelectModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asComment, previousModal);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, any> } = {}
    ): void {
        attrs.cls = "value-container"
        fieldContainer.appendChild(dv.el('span', p[this.field.name], attrs))
        const spacer = fieldContainer.createEl("div", { cls: "spacer" })
        /* button to display input */
        const cycleBtn = fieldContainer.createEl("button")
        setIcon(cycleBtn, FieldIcon[FieldType.Cycle])
        if (!attrs?.options?.alwaysOn) {
            cycleBtn.hide();
            spacer.show();
            fieldContainer.onmouseover = () => {
                cycleBtn.show();
                spacer.hide();
            }
            fieldContainer.onmouseout = () => {
                cycleBtn.hide();
                spacer.show();
            }
        }
        const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
        /* button on click : go to next version*/
        cycleBtn.onclick = async (e) => {
            if (!(file instanceof TFile)) return
            const eF = await fieldsValues.getElementForIndexedPath<ExistingField>(this.plugin, file, this.field.id)
            const value = eF?.value || ""
            const nextOption = this.nextOption(value)
            CycleField.replaceValues(this.plugin, file.path, this.field.id, nextOption);
            if (!attrs?.options?.alwaysOn) {
                cycleBtn.hide();
                spacer.show();
            }
        }
    }
}