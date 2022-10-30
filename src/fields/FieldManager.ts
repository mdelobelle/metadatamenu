import MetadataMenu from "main";
import { Menu, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FCSM from "src/options/FieldCommandSuggestModal";
import { FieldOptions } from "src/components/NoteFields";
import InsertFieldSuggestModal from "src/modals/insertFieldSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as FM, FieldType } from "src/types/fieldTypes";
import Field from "./Field";

export const enum SettingLocation {
    "PluginSettings",
    "FileClassAttributeSettings"
}

export abstract class FieldManager {

    abstract addFieldOption(name: string, value: string, file: TFile, location: Menu | FCSM | FieldOptions): void;
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
    abstract createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean): void;
    public showModalOption: boolean = true;

    constructor(public plugin: MetadataMenu, public field: Field, public type: FieldType) {
        if (field.type !== type) throw Error(`This field is not of type ${type}`)
    }

    static buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string, alias?: string): string {
        const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
        if (destFile) {
            return plugin.app.fileManager.generateMarkdownLink(
                destFile,
                file.path,
                undefined,
                alias,
            )
        }
        return ""
    }

    public validateName(textInput: TextComponent, insertAfter: Element): boolean {
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

    public validateValue(value: string): boolean {
        return true;
    }

    public static async replaceValues(plugin: MetadataMenu, path: string, fieldName: string, value: string): Promise<void> {
        const file = plugin.app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile && file.extension == "md") {
            await plugin.fileTaskManager.pushTask(() => { replaceValues(plugin, file, fieldName, value) });
        }
    }

    public static isMenu(location: Menu | "InsertFieldCommand" | FCSM | FieldOptions): location is Menu {
        return (location as Menu).addItem !== undefined;
    };

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
        value?: string,
        lineNumber?: number,
        inFrontmatter?: boolean,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        if (field) {
            const fieldManager = new FM[field.type](plugin, field);
            fieldManager.createAndOpenFieldModal(file, fieldName, value, lineNumber, inFrontmatter, after, asList, asComment);
        } else {
            const fieldManager = FieldManager.createDefault(plugin, fieldName!);
            fieldManager.createAndOpenFieldModal(file, fieldName!, value, lineNumber, inFrontmatter, after, asList, asComment);
        }
    }

    public static openFieldModal(
        plugin: MetadataMenu,
        file: TFile,
        fieldName: string | undefined,
        value: string,
        lineNumber: number,
        inFrontmatter: boolean,
        after: boolean,
        asList: boolean,
        asComment: boolean
    ) {
        if (!fieldName) {
            const modal = new InsertFieldSuggestModal(plugin, file, lineNumber, inFrontmatter, after);
            modal.open();
        } else {
            const field = plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === fieldName)
            if (field) this.createAndOpenModal(plugin, file, fieldName, field, value, lineNumber, inFrontmatter, after, asList, asComment);
        }
    }

    public static createDefault(plugin: MetadataMenu, name: string): FieldManager {
        const field = Field.createDefault(name);
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

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClicked = () => { }): void {
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
        container.createDiv({ text: valueText })
    }
}