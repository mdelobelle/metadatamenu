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
                item.onClick((evt: MouseEvent) => {
                    replaceValues(app, file, name, nextOption);
                });
                item.setSection("target-metadata");
            });
        } else if (CycleField.isSelect(category)) {
            category.addOption(`${name}_${value}_${nextOption}`, `${name} : ${value} ▷ ${nextOption}`);
            category.modals[`${name}_${value}_${nextOption}`] = () =>
                replaceValues(app, file, name, nextOption);
        };
    };

    validate(): boolean {
        return true
    }

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
    }
}