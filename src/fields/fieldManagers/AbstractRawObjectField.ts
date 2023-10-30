import MetadataMenu from "main";
import { Menu, setIcon, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import RawObjectModal from "src/modals/fields/RawObjectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { FieldOptions } from "src/components/NoteFields";
import { LanguageSupport } from "@codemirror/language";
import { Extension } from "@codemirror/state"
import { ExistingField } from "../existingField";
import * as fieldsValues from 'src/db/stores/fieldsValues'
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";

export default abstract class RawObjectField extends FieldManager {

    abstract dumpValue(value: any): string;
    abstract getExtraExtensions(): Array<LanguageSupport | Extension>
    abstract loadValue(value: any): any;

    constructor(plugin: MetadataMenu, field: Field, type: FieldType.YAML | FieldType.JSON) {
        super(plugin, field, type)
    }

    public getOptionsStr(): string {
        return this.field.options.template || ""
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await fieldsValues.getElementForIndexedPath<ExistingField>(this.plugin, file, indexedPath)
        const modal = new RawObjectModal(this.plugin, file, this.field, eF, indexedPath);
        modal.open()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const iconName = FieldIcon[this.type];
        const action = async () => this.buildAndOpenModal(file, indexedPath);
        if (RawObjectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: iconName
            });
        } else if (RawObjectField.isFieldOptions(location)) {
            location.addOption(FieldIcon[this.type], action, `Update ${name}'s value`);
        }
    };

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu): void { }

    public validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): void {
        const fieldModal = new RawObjectModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = "value-container"
        const fieldValue = (dv.el('span', p[this.field.name], attrs) as HTMLDivElement);
        fieldContainer.appendChild(fieldValue);
        /* button to display input */
        const editBtn = fieldContainer.createEl("button");
        /* end spacer */
        const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
        if (attrs.options?.alwaysOn) spacer.hide();
        setIcon(editBtn, FieldIcon[FieldType.Input]);
        if (!attrs?.options?.alwaysOn) {
            editBtn.hide();
            spacer.show();
            fieldContainer.onmouseover = () => {
                editBtn.show();
                spacer.hide();

            }
            fieldContainer.onmouseout = () => {
                editBtn.hide();
                if (!attrs.options?.alwaysOn) spacer.show();
            }
        }

        /* button on click : remove button and field and display input field*/
        editBtn.onclick = async () => {

            const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path);
            if (file instanceof TFile && file.extension === 'md') {
                await this.buildAndOpenModal(file)
            }
            fieldValue.hide();
            editBtn.hide();
            spacer.hide();
        }
    }
}