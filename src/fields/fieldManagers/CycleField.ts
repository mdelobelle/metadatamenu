import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/optionModals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";

export default class CycleField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Cycle)
    }

    nextOption(value: string): string {
        const options = this.field.options;
        const keys = Object.keys(options);
        const keyForValue = keys.find(key => options[key] === value);
        let nextOption: string;
        if (keyForValue) {
            const nextKey = keys[(keys.indexOf(keyForValue) + 1) % keys.length];
            nextOption = options[nextKey];
        } else {
            nextOption = options[Object.keys(options)[0]];
        };
        return nextOption
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const options = this.field.options;

        if (CycleField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`${name} : ${value} ▷ ${this.nextOption(value)}`);
                item.setIcon(FieldIcon[FieldType.Cycle]);
                item.onClick(() => replaceValues(this.plugin, file, name, this.nextOption(value)));
                item.setSection("metadata-menu.fields");
            });
        } else if (CycleField.isSuggest(location)) {
            location.options.push({
                id: `${name}_${value}_${this.nextOption(value)}`,
                actionLabel: `<span><b>${name}</b> : ${value} ▷ ${this.nextOption(value)}</span>`,
                action: () =>
                    replaceValues(this.plugin, file, name, this.nextOption(value)),
                icon: FieldIcon[FieldType.Cycle]
            })
        };
    };

    createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new SelectModal(this.plugin, file, value || "", this.field, lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    async createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): Promise<void> {
        const options = this.field.options;
        const keys = Object.keys(options);
        const keyForValue = keys.find(key => options[key] === p[this.field.name]);
        let nextOption: string;
        if (keyForValue) {
            const nextKey = keys[(keys.indexOf(keyForValue) + 1) % keys.length];
            nextOption = options[nextKey];
        } else {
            nextOption = options[Object.keys(options)[0]];
        };

        const fieldValue = dv.el('span', p[this.field.name], attrs);
        /* end spacer */
        const spacer = document.createElement("div");
        spacer.setAttr("class", "metadata-menu-dv-field-spacer");
        /* button to display input */
        const button = document.createElement("button");
        setIcon(button, FieldIcon[FieldType.Cycle])
        button.setAttr('class', "metadata-menu-dv-field-button");
        if (!attrs?.options?.alwaysOn) {
            button.hide();
            spacer.show();
            fieldContainer.onmouseover = () => {
                button.show();
                spacer.hide();
            }
            fieldContainer.onmouseout = () => {
                button.hide();
                spacer.show();
            }
        }

        /* button on click : go to next version*/
        button.onclick = (e) => {
            CycleField.replaceValues(this.plugin, p.file.path, this.field.name, nextOption);
            if (!attrs?.options?.alwaysOn) {
                button.hide();
                spacer.show();
            }
        }

        fieldContainer.appendChild(button);
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(spacer);
    }
}