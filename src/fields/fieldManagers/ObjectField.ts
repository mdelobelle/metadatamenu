import MetadataMenu from "main";
import { FieldIcon, FieldType, objectTypes } from "src/types/fieldTypes";

import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../_Field";
import { TFile, Menu, setIcon, TextAreaComponent } from "obsidian";
import NoteFieldsComponent, { FieldOptions } from "src/components/FieldsModal";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import ObjectModal from "src/modals/fields/ObjectModal";
import OptionsList from "src/options/OptionsList";
import { ExistingField } from "../ExistingField";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
import { FieldManager as FM } from "src/types/fieldTypes";
import ObjectListField from "./ObjectListField";
import { FrontmatterObject } from "src/typings/types";
import FieldSettingsModal from "src/settings/FieldSettingsModal";

export default class ObjectField extends FieldManager {
    //TODO refactor, create an abstratObjectField to support the settings dans getDescription methods

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Object)
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string, noteField?: NoteFieldsComponent): void {
        if (noteField) {
            const action = async () => await noteField.moveToObject(`${indexedPath}`);
            if (ObjectField.isFieldOptions(location)) {
                location.addOption(FieldIcon[FieldType.Object], action, `Go to ${this.field.name}'s fields`);
            }
        } else {
            const name = this.field.name
            const action = async () => {
                //create an optionList for this indexedPath
                const note = await Note.buildNote(this.plugin, file)
                const _eF = note.existingFields.find(__eF => __eF.indexedPath === indexedPath)
                if (_eF) {
                    this.createAndOpenFieldModal(file, _eF.field.name, _eF, _eF.indexedPath, undefined, undefined, undefined, undefined)
                } else {
                    const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.plugin.app)
                    const optionsList = new OptionsList(this.plugin, file, fieldCommandSuggestModal, indexedPath)
                    await optionsList.createExtraOptionList()
                }
            }
            if (ObjectField.isSuggest(location)) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: action,
                    icon: FieldIcon[FieldType.Object]
                });
            }
        }
    }
    validateOptions(): boolean {
        return true
    }
    createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        const objectDisplayTemplateTopContainer = container.createDiv({ cls: "vstacked" });
        objectDisplayTemplateTopContainer.createEl("span", { text: "Object display template", cls: 'label' });
        objectDisplayTemplateTopContainer.createEl("span", { text: "All child fields are available with their name enclosed in curly braces.", cls: 'sub-text' });
        const objectDisplayTemplateContainer = objectDisplayTemplateTopContainer.createDiv({ cls: "field-container" });
        const objectTemplate = new TextAreaComponent(objectDisplayTemplateContainer);
        objectTemplate.inputEl.addClass("full-width");
        objectTemplate.inputEl.cols = 50;
        objectTemplate.inputEl.rows = 4;
        objectTemplate.setValue(this.field.options.displayTemplate || "");
        objectTemplate.setPlaceholder("example: {{subFieldA}}, {{subFieldB}}");

        objectTemplate.onChange(value => {
            this.field.options.displayTemplate = value;
            FieldSettingsModal.removeValidationError(objectTemplate);
        })
    }
    createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }
    ): void {
        const fieldValue = dv.el('span', "{...}", { ...attrs, cls: "value-container" });
        fieldContainer.appendChild(fieldValue);
        const editBtn = fieldContainer.createEl("button");
        setIcon(editBtn, FieldIcon[this.field.type])
        editBtn.onclick = async () => {
            const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
            const _eF = file instanceof TFile && await Note.getExistingFieldForIndexedPath(this.plugin, file, this.field.id)
            if (_eF) this.createAndOpenFieldModal(file, this.field.name, _eF, _eF.indexedPath)
        }
    }
    getOptionsStr(): string {
        return ""
    }

    static async getExistingAndMissingFields(plugin: MetadataMenu, file: TFile, indexedPath?: string): Promise<{
        existingFields: ExistingField[],
        missingFields: Field[]
    }> {
        const existingFields = (await Note.getExistingFields(plugin, file)).filter(eF => eF.indexedPath &&
            Field.upperPath(eF.indexedPath) === indexedPath)
        const { id, index } = Field.getIdAndIndex(indexedPath?.split("____").last())
        const missingFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(_f =>
            _f.getFirstAncestor()?.id === id).filter(_f => !existingFields.map(eF => eF.field.id).includes(_f.id)) || []
        return { existingFields, missingFields }
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, eF?: ExistingField,
        indexedPath?: string, lineNumber?: number, asList?: boolean, asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal): Promise<void> {
        const fieldModal = new ObjectModal(this.plugin, file, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal)
        fieldModal.open();
    }

    public getObjectDescription(value: FrontmatterObject = {}): string {
        let template = this.field.options.displayTemplate as string || undefined
        if (!template) {
            const children = this.field.getChildren()
            const childrenNames = children.map(c => c.name)
            return childrenNames.join(", ")
            /*
            const items = []
            for (const [key, _value] of Object.entries(value)) {
                if (childrenNames.includes(key)) {
                    if (typeof _value === "object") {
                        const child = children.find(c => c.name === key)!
                        const cFM = new FM[child.type](this.plugin, child) as ObjectListField | ObjectField
                        items.push(cFM.getObjectDescription(_value))
                    } else {
                        items.push(`${_value}`)
                    }
                } else {
                    items.push(`(${key}?)`)
                }
            }
            return items.join(", ") || `(${this.field.name}?)`
            */

        } else {
            const items: { pattern: string, value: string }[] = []
            const defaultDisplay = (pattern: string) => {
                items.push({ pattern: pattern, value: `(${pattern}?)` })
            }
            const children = this.field.getChildren()
            const childrenNames = children.map(c => c.name)
            const templatePathRegex = new RegExp(`\\{\\{(?<pattern>[^\\}]+?)\\}\\}`, "gu");
            const tP = template.matchAll(templatePathRegex)
            let next = tP.next();
            while (!next.done) {
                if (next.value.groups) {
                    const pattern = next.value.groups.pattern
                    if (childrenNames.includes(pattern)) {
                        try {
                            const _value = (new Function("value", `return value['${pattern}']`))(value)
                            if (["number", "string", "boolean"].includes(typeof _value)) {
                                items.push({ pattern: pattern, value: _value })
                            } else if (typeof _value === "object") {
                                const child = children.find(c => c.name === pattern)!
                                if (objectTypes.includes(child.type)) {
                                    const cFM = new FM[child.type](this.plugin, child) as ObjectField | ObjectListField
                                    items.push({ pattern: pattern, value: cFM.getObjectDescription(_value) })
                                } else {
                                    defaultDisplay(pattern)
                                }
                            } else {
                                defaultDisplay(pattern)
                            }
                        } catch (e) {
                            defaultDisplay(pattern)
                        }
                    } else {
                        defaultDisplay(pattern)
                    }
                }
                next = tP.next()
            }
            for (const item of items) {
                template = template.replace(`{{${item.pattern}}}`, item.value)
            }
            return template
        }
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        container.setText(this.getObjectDescription(value))
    }
}