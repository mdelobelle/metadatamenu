import MetadataMenu from "main";
import { FieldIcon, FieldType, FieldManager as F, objectTypes } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { TFile, Menu, setIcon, TextAreaComponent } from "obsidian";
import NoteFieldsComponent, { FieldOptions } from "src/components/NoteFields";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { postValues } from "src/commands/postValues";
import { Note } from "src/note/note";
import { ExistingField } from "../ExistingField";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import ObjectModal from "src/modals/fields/ObjectModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as FM } from "src/types/fieldTypes";
import ObjectField from "./ObjectField";
import { FrontmatterObject } from "src/typings/types";


export interface ObjectListItem {
    fields: ExistingField[],
    indexInList: number,
    indexedPath: string | undefined
}

export default class ObjectListField extends FieldManager {
    /*
    this object contains a list of objects.
    //TODO insert listItem at position
    //TODO reorder listItems
    */
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.ObjectList)
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string, noteField?: NoteFieldsComponent): void {
        const name = this.field.name
        if (noteField) {
            const moveToObject = async () => await noteField.moveToObject(`${indexedPath}`);
            const removeObject = async () => {
                if (indexedPath) {
                    const note = await Note.buildNote(this.plugin, file)
                    await note.removeObject(indexedPath)
                }
            }
            if (ObjectListField.isFieldOptions(location)) {
                location.addOption(FieldIcon[FieldType.ObjectList], moveToObject, `Go to this ${name} item`);
                location.addOption("trash", removeObject, `Remove this ${name} item`)
            }
        } else {
            const moveToObject = async () => {
                const _eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
                if (_eF) this.createAndOpenFieldModal(file, _eF.field.name, _eF, _eF.indexedPath, undefined, undefined, undefined, undefined)
            }
            const removeObject = async () => {
                if (indexedPath) {
                    const note = await Note.buildNote(this.plugin, file)
                    await note.removeObject(indexedPath)
                }
            }
            if (ObjectListField.isSuggest(location)) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: moveToObject,
                    icon: FieldIcon[FieldType.ObjectList]
                });
                location.options.push({
                    id: `remove_${name}`,
                    actionLabel: `<span>Remove this <b>${name}</b> item</span>`,
                    action: removeObject,
                    icon: "trash"
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
        objectDisplayTemplateTopContainer.createEl("span", { text: "The number of items is referenced by the keyword 'itemsCount'", cls: 'sub-text' });
        const objectDisplayTemplateContainer = objectDisplayTemplateTopContainer.createDiv({ cls: "field-container" });
        const objectTemplate = new TextAreaComponent(objectDisplayTemplateContainer);
        objectTemplate.inputEl.addClass("full-width");
        objectTemplate.inputEl.cols = 50;
        objectTemplate.inputEl.rows = 4;
        objectTemplate.setValue(this.field.options.displayTemplate || "");
        objectTemplate.setPlaceholder("example: {{itemsCount}} items");

        objectTemplate.onChange(value => {
            this.field.options.displayTemplate = value;
            FieldSettingsModal.removeValidationError(objectTemplate);
        })


        const itemDisplayTemplateTopContainer = container.createDiv({ cls: "vstacked" });
        itemDisplayTemplateTopContainer.createEl("span", { text: "Item display template", cls: 'label' });
        itemDisplayTemplateTopContainer.createEl("span", { text: "all child fields are available with their name enclosed in curly braces. Their index is referenced by the keyword 'itemIndex'", cls: 'sub-text' });
        const itemDisplayTemplateContainer = itemDisplayTemplateTopContainer.createDiv({ cls: "field-container" });
        const template = new TextAreaComponent(itemDisplayTemplateContainer);
        template.inputEl.addClass("full-width");
        template.inputEl.cols = 50;
        template.inputEl.rows = 4;
        template.setValue(this.field.options.itemDisplayTemplate || "");
        template.setPlaceholder("example: {{itemIndex}}: {{subfieldA}} - {{subfieldC}}");

        template.onChange(value => {
            this.field.options.itemDisplayTemplate = value;
            FieldSettingsModal.removeValidationError(template);
        })
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {
        const fieldValue = dv.el('span', "{...}", { ...attrs, cls: "value-container" });
        fieldContainer.appendChild(fieldValue);
        const editBtn = fieldContainer.createEl("button");
        setIcon(editBtn, FieldIcon[this.field.type])
        editBtn.onclick = async () => {
            const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
            const _eF = file instanceof TFile &&
                file.extension == "md" &&
                await Note.getExistingFieldForIndexedPath(this.plugin, file, this.field.id)
            if (_eF) this.createAndOpenFieldModal(file, this.field.name, _eF, _eF.indexedPath)
        }
    }
    getOptionsStr(): string {
        return ""
    }

    public async addObjectListItem(file: TFile, eF?: ExistingField, indexedPath?: string) {
        //search for object's value in note
        const value = eF?.value
        const indexForNew = !value || value.length === 0 ? 0 : value.length
        if (indexedPath) await postValues(this.plugin, [{ indexedPath: `${indexedPath}[${indexForNew}]`, payload: { value: "" } }], file, -1)
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, eF?: ExistingField, indexedPath?: string,
        lineNumber?: number, asList?: boolean, asBlockquote?: boolean, previousModal?: ObjectModal | ObjectListModal): Promise<void> {
        const fieldModal = new ObjectListModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal)
        fieldModal.open();
    }

    public getObjectDescription(value: FrontmatterObject = {}): string {
        let template = this.field.options.displayTemplate as string || undefined
        const itemsCount = Object.keys(value).length
        if (!template) return `<${this.field.getChildren().map(f => f.name).join(", ")}>(*${itemsCount})`
        template = template.replace(`{{itemsCount}}`, `${itemsCount}`)
        return template
    }

    public displayItem(value: any, itemIndex: number): string {
        let template = this.field.options.itemDisplayTemplate as string || undefined
        const items: { pattern: string, value: string }[] = []
        const defaultDisplay = (pattern: string) => {
            items.push({ pattern: pattern, value: `(${pattern}?)` })
        }
        if (!template || !value) return `<${this.field.getChildren().map(f => f.name).join(", ")}>[${itemIndex}]`
        else {
            const children = this.field.getChildren()
            const childrenNames = children.map(c => c.name)
            const templatePathRegex = new RegExp(`\\{\\{(?<pattern>[^\\}]+?)\\}\\}`, "gu");
            const tP = template.matchAll(templatePathRegex)
            let next = tP.next();
            while (!next.done) {
                if (next.value.groups) {
                    const pattern = next.value.groups.pattern
                    if (pattern === 'itemIndex') {
                        items.push({ pattern: "itemIndex", value: `${itemIndex}` })
                    } else if (childrenNames.includes(pattern)) {
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
        }
        for (const item of items) {
            template = template.replace(`{{${item.pattern}}}`, item.value)
        }
        return template
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        container.setText(this.getObjectDescription(value))
    }
}