import MetadataMenu from "main";
import { App, Menu, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import { FileClass } from "src/fileClass/fileClass";
import FieldCommandSuggestModal from "src/optionModals/FieldCommandSuggestModal";
import InsertFieldSuggestModal from "src/optionModals/insertFieldSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as FM, FieldType } from "src/types/fieldTypes";
import Field from "./Field";


export interface FieldManager {
    field: Field;
}

export const enum SettingLocation {
    "PluginSettings",
    "FileClassAttributeSettings"
}

export abstract class FieldManager {

    abstract addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldCommandSuggestModal): void;
    abstract validateOptions(): boolean;
    abstract createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void;
    abstract createDvField(plugin: MetadataMenu, dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }): Promise<void>
    abstract getOptionsStr(): string;
    abstract createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void

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

    public static isMenu(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is Menu {
        return (location as Menu).addItem !== undefined;
    };

    public static isSuggest(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is FieldCommandSuggestModal {
        return (location as FieldCommandSuggestModal).getItems !== undefined;
    };

    public static isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FieldCommandSuggestModal): location is "InsertFieldCommand" {
        return (location as string) === "InsertFieldCommand";
    }

    public static createAndOpenModal(plugin: MetadataMenu, file: TFile, fieldName: string, field: Field | undefined, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        if (field) {
            const fieldManager = new FM[field.type](field);
            fieldManager.createAndOpenFieldModal(plugin.app, file, fieldName, lineNumber, inFrontmatter, after);
        } else {
            const fieldManager = FieldManager.createDefault(fieldName!);
            fieldManager.createAndOpenFieldModal(plugin.app, file, fieldName!, lineNumber, inFrontmatter, after);
        }
    }

    public static openFieldOrFieldSelectModal(plugin: MetadataMenu, file: TFile, fieldName: string | undefined, lineNumber: number, inFrontmatter: boolean, after: boolean, fileClass?: FileClass) {
        if (!fieldName) {
            const modal = new InsertFieldSuggestModal(plugin, file, lineNumber, inFrontmatter, after, fileClass);
            modal.open();
        } else {
            if (fileClass) {
                const fileClassAttributesWithName = fileClass.attributes.filter(attr => attr.name == fieldName);
                let field: Field | undefined
                if (fileClassAttributesWithName.length > 0) {
                    const fileClassAttribute = fileClassAttributesWithName[0];
                    field = fileClassAttribute.getField();
                }
                this.createAndOpenModal(plugin, file, fieldName, field, lineNumber, inFrontmatter, after);
            } else {
                const field = plugin.settings.presetFields.filter(_field => _field.name == fieldName)[0];
                this.createAndOpenModal(plugin, file, fieldName, field, lineNumber, inFrontmatter, after);
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