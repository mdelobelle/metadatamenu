import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { App, Menu, TFile, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import valueSelectModal from "src/optionModals/valueSelectModal";
import { replaceValues } from "src/commands/replaceValues";

export default class CycleField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Cycle)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
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
        if (CycleField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`${name} : ${value} ▷ ${nextOption}`);
                item.setIcon('switch');
                item.onClick(() => replaceValues(app, file, name, nextOption));
                item.setSection("target-metadata");
            });
        } else if (CycleField.isSelect(category)) {
            category.addOption(`${name}_${value}_${nextOption}`, `${name} : ${value} ▷ ${nextOption}`);
            category.modals[`${name}_${value}_${nextOption}`] = () =>
                replaceValues(app, file, name, nextOption);
        };
    };

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueSelectModal(app, file, this.field.name, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
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
        button.setText("▶️");
        button.setAttr('class', "metadata-menu-dv-field-button");
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

        /* button on click : go to next version*/
        button.onclick = (e) => {
            CycleField.replaceValues(plugin.app, p["file"]["path"], this.field.name, nextOption);
            button.hide();
            spacer.show();
        }

        fieldContainer.appendChild(button);
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(spacer);
    }
}