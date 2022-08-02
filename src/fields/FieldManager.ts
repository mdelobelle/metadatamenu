import { App, TFile, Menu } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "./Field";


export interface FieldManager {
    field: Field;
}

export abstract class FieldManager {

    abstract addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void

    constructor(field: Field, type: FieldType) {
        if (field.type !== type) throw Error(`This field is not of type ${type}`)
        this.field = field
    }

    static isMenu(category: Menu | SelectModal): category is Menu {
        return (category as Menu).addItem !== undefined;
    };

    static isSelect(category: Menu | SelectModal): category is SelectModal {
        return (category as SelectModal).modals !== undefined;
    };
}