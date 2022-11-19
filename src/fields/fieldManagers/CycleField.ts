import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";

export default class CycleField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Cycle)
        this.showModalOption = false;
    }

    public nextOption(value: string): string {
        let nextOption: string;
        const values = this.getOptionsList();
        if (values.indexOf(value) === -1) {
            nextOption = values[0] || ""
        } else {
            nextOption = values[(values.indexOf(value) + 1) % values.length]
        }
        return nextOption
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

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClicked?: () => void): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let valueText: string;
        if (dvApi) {
            switch (dvApi.page(file.path)[fieldName]) {
                case undefined: valueText = ""; break;
                case null: valueText = ""; break;
                case false: valueText = "false"; break;
                case 0: valueText = "0"; break;
                default: valueText = dvApi.page(file.path)[fieldName];
            }
        } else {
            valueText = "";
        }
        container.createDiv({ text: this.getRawOptionFromDuration(valueText) || valueText })
    }

    public async next(name: string, value: string, file: TFile): Promise<void> {
        let matchedValue = this.getRawOptionFromDuration(value) || value;
        await this.plugin.fileTaskManager
            .pushTask(() => { replaceValues(this.plugin, file, name, this.nextOption(matchedValue).toString()) })
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        // dataview is converting strings to duration, let's find back the raw string option from duration if needed
        let matchedValue = this.getRawOptionFromDuration(value) || value;
        const iconName = FieldIcon[FieldType.Cycle];
        const action = async () => this.next(name, value, file);
        if (CycleField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`${name} : ${matchedValue} ▷ ${this.nextOption(matchedValue)}`);
                item.setIcon(iconName);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            });
        } else if (CycleField.isSuggest(location)) {
            location.options.push({
                id: `${name}_${matchedValue}_${this.nextOption(matchedValue)}`,
                actionLabel: `<span><b>${name}</b> : ${matchedValue} ▷ ${this.nextOption(matchedValue)}</span>`,
                action: action,
                icon: iconName
            })
        } else if (CycleField.isFieldOptions(location)) {
            location.addOption(iconName, action, `${matchedValue} ▷ ${this.nextOption(matchedValue)}`);
        };
    };

    public createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean): void {
        const fieldModal = new SelectModal(this.plugin, file, value || "", this.field, lineNumber, inFrontmatter, after, asList, asComment);
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
        const nextOption = this.nextOption(p[this.field.name])
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

        /* button on click : go to next version*/
        cycleBtn.onclick = (e) => {
            CycleField.replaceValues(this.plugin, p.file.path, this.field.name, nextOption);
            if (!attrs?.options?.alwaysOn) {
                cycleBtn.hide();
                spacer.show();
            }
        }
    }
}