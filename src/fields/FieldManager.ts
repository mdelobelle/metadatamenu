import { App, TFile, Menu, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "./Field";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { replaceValues } from "src/commands/replaceValues";
import MetadataMenu from "main";
import { FieldManager as FM } from "src/types/fieldTypes";
import fieldSelectModal from "src/optionModals/fieldSelectModal";
import { FileClass } from "src/fileClass/fileClass";


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
    abstract createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void;
    abstract createDvField(plugin: MetadataMenu, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }): Promise<void>
    abstract getOptionsStr(): string;
    abstract createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void

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

    async validateValue(value: string): Promise<boolean> {
        return true;
    }

    public static replaceValues(app: App, path: string, fieldName: string, value: string): void {
        const file = app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile && file.extension == "md") {
            replaceValues(app, file, fieldName, value)
        }
    }

    public static isMenu(category: Menu | SelectModal): category is Menu {
        return (category as Menu).addItem !== undefined;
    };

    public static isSelect(category: Menu | SelectModal): category is SelectModal {
        return (category as SelectModal).modals !== undefined;
    };

    public static createAndOpenModal(plugin: MetadataMenu, file: TFile, fieldName: string, field: Field | undefined, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        if (field) {
            const fieldManager = new FM[field.type](field);
            fieldManager.createAndOpenFieldModal(plugin.app, file, fieldName, lineNumber, inFrontmatter, top);
        } else {
            const fieldManager = FieldManager.createDefault(fieldName!);
            fieldManager.createAndOpenFieldModal(plugin.app, file, fieldName!, lineNumber, inFrontmatter, top);
        }
    }

    public static openFieldOrFieldSelectModal(plugin: MetadataMenu, file: TFile, fieldName: string | undefined, lineNumber: number, line: string, inFrontmatter: boolean, top: boolean, fileClass?: FileClass) {
        if (!fieldName) {
            const modal = new fieldSelectModal(plugin, file, lineNumber, line, inFrontmatter, top, fileClass);
            modal.open();
        } else {
            if (fileClass) {
                const fileClassAttributesWithName = fileClass.attributes.filter(attr => attr.name == fieldName);
                let field: Field | undefined
                if (fileClassAttributesWithName.length > 0) {
                    const fileClassAttribute = fileClassAttributesWithName[0];
                    field = fileClassAttribute.getField();
                }
                this.createAndOpenModal(plugin, file, fieldName, field, lineNumber, inFrontmatter, top);
            } else {
                const field = plugin.settings.presetFields.filter(_field => _field.name == fieldName)[0];
                this.createAndOpenModal(plugin, file, fieldName, field, lineNumber, inFrontmatter, top);
            };
        }
    }

    public static createDefault(name: string): FieldManager {
        const field = Field.createDefault(name);
        return new FM[field.type](field);
    }

    public static stringToBoolean(value: string): boolean {
        let toBooleanValue: boolean = false;
        if (isBoolean(value)) {
            toBooleanValue = value;
        } else if (/true/i.test(value)) {
            toBooleanValue = true;
        } else if (/false/i.test(value)) {
            toBooleanValue = false;
        } else {
            throw Error("this value is not a boolean")
        };
        return toBooleanValue;
    }
}