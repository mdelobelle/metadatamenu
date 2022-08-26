import MetadataMenu from "main";
import { App, Menu, setIcon, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FieldCommandSuggestModal from "src/optionModals/FieldCommandSuggestModal";
import SelectModal from "src/optionModals/fields/SelectModal";
import FieldSelectModal from "src/optionModals/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";

export default class CycleField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Cycle)
    }

    addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldSelectModal | FieldCommandSuggestModal): void {
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
        if (CycleField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`${name} : ${value} ▷ ${nextOption}`);
                item.setIcon(FieldIcon[FieldType.Cycle]);
                item.onClick(() => replaceValues(app, file, name, nextOption));
                item.setSection("target-metadata");
            });
        } else if (CycleField.isSelect(location)) {
            location.addOption(`${name}_${value}_${nextOption}`, `${name} : ${value} ▷ ${nextOption}`);
            location.modals[`${name}_${value}_${nextOption}`] = () =>
                replaceValues(app, file, name, nextOption);
        } else if (CycleField.isSuggest(location)) {
            location.options.push({
                id: `${name}_${value}_${nextOption}`,
                actionLabel: `<span><b>${name}</b> : ${value} ▷ ${nextOption}</span>`,
                action: () =>
                    replaceValues(app, file, name, nextOption),
                icon: FieldIcon[FieldType.Cycle]
            })
        };
    };

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new SelectModal(app, file, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    async createDvField(
        plugin: MetadataMenu,
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
            CycleField.replaceValues(plugin.app, p["file"]["path"], this.field.name, nextOption);
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