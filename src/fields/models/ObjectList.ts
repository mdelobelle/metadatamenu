import { Constructor, FrontmatterObject } from "src/typings/types"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import * as AbstractObject from "./abstractModels/AbstractObject"
import { ButtonComponent, TFile, TextAreaComponent, setIcon } from "obsidian"
import { ActionLocation, IFieldManager, LegacyField, Target, fieldValueManager, isFieldActions, isSingleTargeted, isSuggest, removeValidationError } from "../Field"
import { ExistingField } from "../ExistingField"
import NoteFieldsComponent from "src/components/FieldsModal"
import MetadataMenu from "main"
import { getIcon, mapFieldType, objectTypes } from "../Fields"
import { Note } from "src/note/note"
import { postValues } from "src/commands/postValues"

export class Base implements IFieldBase {
    tooltip: "Accepts a list of object fields"
    colorClass: "lookup"
    type = <const>"ObjectList"
    tagName = "object-list"
    icon = "boxes"
}

export interface Options extends AbstractObject.Options {
    itemDisplayTemplate?: string
}
export interface DefaultedOptions extends AbstractObject.DefaultedOptions {
    itemDisplayTemplate: string
}
export const DefaultOptions: DefaultedOptions = {
    ...AbstractObject.DefaultOptions,
    itemDisplayTemplate: ""
}

export interface ObjectListItem {
    fields: ExistingField[],
    indexInList: number,
    indexedPath: string | undefined
}

export function settingsModal(Base: Constructor<ISettingsModal<AbstractObject.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractObject.settingsModal(Base)
    return class SettingModal extends base {
        createSettingContainer = () => {
            super.createSettingContainer()
            const container = this.optionsContainer
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
                removeValidationError(template);
            })
        }
        validateOptions(): boolean {
            //TODO is valid if every nested fields are true
            return true
        }
    }
}

export interface Modal<Target> extends AbstractObject.Modal<Target> {
    toRemove?: ObjectListItem;
    objects: ObjectListItem[]
}


export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = AbstractObject.valueModal(managedField, plugin)
    return class ValueModal extends base {
        public toRemove?: ObjectListItem;
        public objects: ObjectListItem[] = []

        public buildAddButton(container: HTMLDivElement) {
            const infoContainer = container.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to Add")
            const addButton = new ButtonComponent(container)
            addButton.setIcon("plus")
            addButton.onClick(async () => { this.onAdd() })
            addButton.setCta();
            addButton.setTooltip("Add a new item")
        }


        public async onAdd() {
            const mF = this.managedField
            if (!isSingleTargeted(mF)) return
            // const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as ObjectListField
            if (this.managedField.eF) {
                // await fieldManager.addObjectListItem(this.file, this.eF, this.indexedPath);
                await addObjectListItem(mF)
                this.close()
                this.open()
            } else if (mF.indexedPath) {
                //first insert the empty object list
                await postValues(mF.plugin, [{ indexedPath: mF.indexedPath, payload: { value: "" } }], mF.target)
                this.close()
                this.open()
            }
        }

        async onOpen() {
            const mF = this.managedField
            if (isSingleTargeted(mF)) {
                const _eF = await Note.getExistingFieldForIndexedPath(mF.plugin, mF.target, mF.indexedPath)
                this.objects = await _eF?.getChildrenFields(mF.plugin, mF.target) || []
            }
            super.onOpen()
        };


        getSuggestions(query: string = ""): ObjectListItem[] {
            return this.objects
        }

        renderSuggestion(item: ObjectListItem, el: HTMLElement) {
            const mF = this.managedField
            const container = el.createDiv({ cls: "value-container" })
            const index = container.createDiv({ cls: "index-container" })
            index.setText(`${item.indexInList}`)
            const valueContainer = container.createDiv()
            if (item.fields.length) {
                // const fM = new FM[this.field.type](this.plugin, this.field) as ObjectListField
                valueContainer.setText(displayItem(mF, mF.eF?.value[item.indexInList], item.indexInList))
            } else {
                valueContainer.setText("<--empty-->")
                valueContainer.addClass("empty")
            }
            container.createDiv({ cls: "spacer" })
            const removeContainer = container.createDiv({ cls: "icon-container" })
            setIcon(removeContainer, "trash")
            removeContainer.onclick = () => { this.toRemove = item }
        }

        async onChooseSuggestion(item: ObjectListItem, evt: MouseEvent | KeyboardEvent) {
            const mF = this.managedField
            if (!isSingleTargeted(mF)) return
            const reOpen = async () => {
                const eF = await Note.getExistingFieldForIndexedPath(mF.plugin, mF.target, mF.indexedPath)
                if (eF) {
                    fieldValueManager(mF.plugin, mF.id, mF.fileClassName, mF.target, eF, mF.indexedPath, undefined, undefined, undefined, this.previousModal)?.openModal()
                    // const thisFieldManager = new FieldManager[eF.field.type](this.plugin, eF.field)
                    // thisFieldManager.createAndOpenFieldModal(this.file, eF.field.name, eF, eF.indexedPath, undefined, undefined, undefined, this.previousModal)
                }
            }
            if (this.toRemove) {
                const note = await Note.buildNote(mF.plugin, mF.target)
                if (item.indexedPath) {
                    await note.removeObject(item.indexedPath)
                    await reOpen()
                }
            } else {
                //list item 
                fieldValueManager(mF.plugin, mF.id, mF.fileClassName, mF.target, undefined, item.indexedPath, undefined, undefined, undefined, this)?.openModal()
                // const objectModal = new ObjectModal(this.plugin, this.file, undefined, item.indexedPath,
                //     undefined, undefined, undefined, this)
                // objectModal.open()
            }
        }

    }
}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined, noteField?: NoteFieldsComponent): void {
    const iconName = getIcon(mapFieldType(field.type));
    const name = field.name
    if (noteField) {
        const moveToObject = async () => await noteField.moveToObject(`${indexedPath}`);
        const removeObject = async () => {
            if (indexedPath) {
                const note = await Note.buildNote(plugin, file)
                await note.removeObject(indexedPath)
            }
        }
        if (isFieldActions(location)) {
            location.addOption(iconName, moveToObject, `Go to this ${name} item`);
            location.addOption("trash", removeObject, `Remove this ${name} item`)
        }
    } else {
        const moveToObject = async () => {
            const _eF = await Note.getExistingFieldForIndexedPath(plugin, file, indexedPath)
            if (_eF) fieldValueManager(plugin, _eF?.field.id, _eF?.field.fileClassName, file, _eF, _eF?.indexedPath, undefined, undefined, undefined, undefined)?.openModal()
            // if (_eF) this.createAndOpenFieldModal(file, _eF.field.name, _eF, _eF.indexedPath, undefined, undefined, undefined, undefined)
        }
        const removeObject = async () => {
            if (indexedPath) {
                const note = await Note.buildNote(plugin, file)
                await note.removeObject(indexedPath)
            }
        }
        if (isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: moveToObject,
                icon: iconName
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

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    return AbstractObject.createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function getOptionsStr(managedField: IFieldManager<Target, Options>): string {
    return AbstractObject.getOptionsStr(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked = () => { }) {
    container.setText(getObjectDescription(managedField, managedField.value))
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return true
}

//#region utils

export function getObjectDescription(managedField: IFieldManager<Target, Options>, value: FrontmatterObject = {}): string {
    let template = managedField.options.displayTemplate as string || undefined
    const itemsCount = Object.keys(value).length
    if (!template) return `<${managedField.getChildren().map(f => f.name).join(", ")}>(*${itemsCount})`
    template = template.replace(`{{itemsCount}}`, `${itemsCount}`)
    return template
}

export function displayItem(managedField: IFieldManager<Target, Options>, value: any, itemIndex: number): string {
    let template = managedField.options.itemDisplayTemplate as string || undefined
    const items: { pattern: string, value: string }[] = []
    const defaultDisplay = (pattern: string) => {
        items.push({ pattern: pattern, value: `(${pattern}?)` })
    }
    if (!template || !value) return `<${managedField.getChildren().map(f => f.name).join(", ")}>[${itemIndex}]`
    else {
        const children = managedField.getChildren()
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
                                const cFVM = fieldValueManager(managedField.plugin, child.id, child.fileClassName, managedField.target, undefined, undefined)
                                items.push({ pattern: pattern, value: getObjectDescription(cFVM as IFieldManager<Target, Options>, _value) })
                                // const cFM = new FM[child.type](this.plugin, child) as ObjectField | ObjectListField
                                // items.push({ pattern: pattern, value: cFM.getObjectDescription(_value) })
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

export async function addObjectListItem(managedField: IFieldManager<TFile, Options>) {
    //search for object's value in note
    const mF = managedField
    const value = managedField.value
    const indexForNew = !value || value.length === 0 ? 0 : value.length
    if (mF.indexedPath) await postValues(mF.plugin, [{ indexedPath: `${mF.indexedPath}[${indexForNew}]`, payload: { value: "" } }], mF.target, -1)
}

//#endregion