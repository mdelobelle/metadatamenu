import MetadataMenu from "main";
import { Menu, TextComponent, TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import FCSM from "src/options/FieldCommandSuggestModal";
import { FieldOptions } from "src/components/NoteFields";
import InsertFieldSuggestModal from "src/modals/insertFieldSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as FM, FieldType } from "src/types/fieldTypes";
import Field from "./_Field";
import { ExistingField } from "./ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";

export const enum SettingLocation {
    "PluginSettings",
    "FileClassAttributeSettings"
}

export abstract class FieldManager {
    abstract addFieldOption(file: TFile, location: Menu | FCSM | FieldOptions, indexedPath?: string, ...args: any): void;
    abstract validateOptions(): boolean;
    abstract createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void;
    abstract createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: {
            cls?: string,
            attr?: Record<string, string>,
            options?: Record<string, string>
        }
    ): void
    abstract getOptionsStr(): string;
    abstract createAndOpenFieldModal(file: TFile, selectedFieldName: string, eF?: ExistingField, indexedPath?: string,
        lineNumber?: number, asList?: boolean, asBlockquote?: boolean, previousModal?: ObjectModal | ObjectListModal): void;
    public showModalOption: boolean = true;

    constructor(public plugin: MetadataMenu, public field: Field, public type: FieldType) {
        if (field.type !== type) throw Error(`This field is not of type ${type}`)
    }

    static buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string, subPath?: string, alias?: string): string {
        const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
        if (destFile) {
            return plugin.app.fileManager.generateMarkdownLink(
                destFile,
                file.path,
                subPath,
                alias,
            )
        }
        return ""
    }

    public validateName(textInput: TextComponent, contentEl: Element): boolean {
        let error = false;
        if (/^[#>-]/.test(this.field.name)) {
            FieldSettingsModal.setValidationError(
                textInput,
                "Field name cannot start with #, >, -"
            );
            error = true;
        };
        if (this.field.name == "") {
            FieldSettingsModal.setValidationError(
                textInput,
                "Field name can not be Empty"
            );
            error = true;
        };
        if (this.field.fileClassName) {
            const fields = this.plugin.fieldIndex.fileClassesFields
                .get(this.field.fileClassName)?.filter(_f => _f.path === this.field.path && _f.id !== this.field.id && _f.fileClassName === this.field.fileClassName)
            if (fields?.map(_f => _f.name).includes(this.field.name)) {
                FieldSettingsModal.setValidationError(
                    textInput,
                    `There is already a field with this name for this path in this ${this.plugin.settings.fileClassAlias}. Please choose another name`
                );
                error = true;
            }
        } else {
            const fields = this.plugin.presetFields.filter(_f => _f.path === this.field.path && _f.id !== this.field.id)
            if (fields?.map(_f => _f.name).includes(this.field.name)) {
                FieldSettingsModal.setValidationError(
                    textInput,
                    "There is already a field with this name for this path in presetFields. Please choose another name"
                );
                error = true;
            }
        }
        return !error
    }

    public validateValue(value: string): boolean {
        return true;
    }

    public static async replaceValues(plugin: MetadataMenu, path: string, id: string, value: string): Promise<void> {
        const file = plugin.app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile && file.extension == "md") {
            await postValues(plugin, [{ indexedPath: id, payload: { value: value } }], file)
        }
    }

    public static isSuggest(location: Menu | "InsertFieldCommand" | FCSM | FieldOptions): location is FCSM {
        return (location as FCSM).getItems !== undefined;
    };

    public static isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FCSM | FieldOptions): location is "InsertFieldCommand" {
        return (location as string) === "InsertFieldCommand";
    }

    public static isFieldOptions(location: Menu | "InsertFieldCommand" | FCSM | FieldOptions): location is FieldOptions {
        return (location as FieldOptions).addOption !== undefined;
    }

    public static createAndOpenModal(
        plugin: MetadataMenu,
        file: TFile,
        fieldName: string,
        field: Field | undefined,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean
    ): void {
        if (field) {
            const fieldManager = new FM[field.type](plugin, field);
            fieldManager.createAndOpenFieldModal(file, fieldName, eF, indexedPath, lineNumber, asList, asBlockquote);
        } else {
            const fieldManager = FieldManager.createDefault(plugin, fieldName!);
            fieldManager.createAndOpenFieldModal(file, fieldName!, eF, indexedPath, lineNumber, asList, asBlockquote);
        }
    }

    public static openFieldModal(
        plugin: MetadataMenu,
        file: TFile,
        fieldName: string | undefined,
        lineNumber: number,
        asList: boolean,
        asBlockquote: boolean
    ) {
        if (!fieldName) {
            const modal = new InsertFieldSuggestModal(plugin, file, lineNumber, asList, asBlockquote);
            modal.open();
        } else {
            const field = plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === fieldName)
            if (field) this.createAndOpenModal(plugin, file, fieldName, field, undefined, undefined, lineNumber, asList, asBlockquote);
        }
    }

    public static createDefault(plugin: MetadataMenu, name: string): FieldManager {
        const field = Field.createDefault(plugin, name);
        return new FM[field.type](plugin, field);
    }

    public static stringToBoolean(value: string): boolean {
        let toBooleanValue: boolean = false;
        if (isBoolean(value)) {
            toBooleanValue = value;
        } else if (/true/i.test(value) || /1/.test(value)) {
            toBooleanValue = true;
        } else if (/false/i.test(value) || /0/.test(value)) {
            toBooleanValue = false;
        };
        return toBooleanValue;
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked = () => { }): void {
        let valueText: string;
        switch (value) {
            case undefined: valueText = ""; break;
            case null: valueText = ""; break;
            case false: valueText = "false"; break;
            case 0: valueText = "0"; break;
            default: valueText = value.toString() || "";
        }
        container.createDiv({ text: `${valueText}` })
    }
}