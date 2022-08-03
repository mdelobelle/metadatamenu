import { App, TFile, Menu, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "./Field";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { replaceValues } from "src/commands/replaceValues";
import MetadataMenu from "main";


export interface FieldManager {
    field: Field;
}

export const enum SettingLocation {
    "PluginSettings",
    "FileClassAttributeSettings"
}

export abstract class FieldManager {

    abstract addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void;
    abstract validateOptions(): boolean;
    abstract createSettingContainer(parentContainer: HTMLDivElement, location?: SettingLocation): void;
    abstract createDvField(plugin: MetadataMenu, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls: string, attr: Record<string, string> }): void

    constructor(field: Field, type: FieldType) {
        if (field.type !== type) throw Error(`This field is not of type ${type}`)
        this.field = field
    }

    validateName(textInput: TextComponent, insertAfter: Element): boolean {
        let error = false;
        if (/^[#>-]/.test(this.field.name)) {
            FieldSettingsModal.setValidationError(
                textInput, insertAfter,
                "Field name cannot start with #, >, -"
            );
            error = true;
        };
        if (this.field.name == "") {
            FieldSettingsModal.setValidationError(
                textInput, insertAfter,
                "Field name can not be Empty"
            );
            error = true;
        };
        return !error
    }

    static isMenu(category: Menu | SelectModal): category is Menu {
        return (category as Menu).addItem !== undefined;
    };

    static isSelect(category: Menu | SelectModal): category is SelectModal {
        return (category as SelectModal).modals !== undefined;
    };
}