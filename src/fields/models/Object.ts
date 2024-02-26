import MetadataMenu from "main"
import { TFile } from "obsidian"
import { postValues } from "src/commands/postValues"
import NoteFieldsComponent from "src/components/FieldsModal"
import { Note } from "src/note/note"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import OptionsList from "src/options/OptionsList"
import { Constructor, FrontmatterObject } from "src/typings/types"
import { ExistingField } from "../ExistingField"
import { ActionLocation, Field, FieldValueManager, IField, IFieldManager, Target, buildField, fieldValueManager, isFieldActions, isSingleTargeted, isSuggest } from "../Field"
import { TypesOptionsMap, displayValue as getDisplayValue, valueString as getValueString, getIcon } from "../Fields"
import { IFieldBase } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import { getNextOption } from "./Cycle"
import { ObjectListItem, Modal as ObjectListModal, Options as ObjectListOptions } from "./ObjectList"
import * as AbstractObject from "./abstractModels/AbstractObject"
import { setTimeout } from "timers/promises"

export class Base implements IFieldBase {
    type = <const>"Object"
    tagName = "object"
    icon = "package"
    tooltip = "Accepts an object with nested fields"
    colorClass = "lookup"
}

export interface Options extends AbstractObject.Options { }
export interface DefaultedOptions extends Options {
    displayTemplate: string
}
export const DefaultOptions: DefaultedOptions = {
    ...AbstractObject.DefaultOptions,
    displayTemplate: ""
}

export function settingsModal(Base: Constructor<ISettingsModal<AbstractObject.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    return AbstractObject.settingsModal(Base)
}

export interface Modal<Target> extends AbstractObject.Modal<Target> {
    existingFields: ExistingField[]
    missingFields: Field[]
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = AbstractObject.valueModal(managedField, plugin)
    return class ValueModal extends base {
        public existingFields: ExistingField[] = []
        public missingFields: Field[] = []
        async onOpen() {
            if (this.managedField.indexedPath && isSingleTargeted(this.managedField)) {
                const { existingFields, missingFields } = await AbstractObject.getExistingAndMissingFields(
                    this.managedField.plugin, this.managedField.target, this.managedField.indexedPath)
                this.existingFields = existingFields
                this.missingFields = missingFields

            }
            super.onOpen()
        };

        getSuggestions(query: string = ""): Array<ExistingField | Field> {
            return [...this.existingFields, ...this.missingFields].filter(f => {
                if (f instanceof ExistingField) {
                    return f.field.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
                } else {
                    return f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
                }
            })
        }

        renderSuggestion(item: ExistingField | Field, el: HTMLElement) {
            const container = el.createDiv({ cls: "value-container" })
            if (item instanceof ExistingField) {
                container.createDiv({ text: `${item.field.name} :`, cls: "label-container" })
                const valueContainer = container.createDiv()
                const fieldVM = fieldValueManager(this.managedField.plugin, item.field.id, item.field.fileClassName, item.file, item, item.indexedPath, item.lineNumber);
                (fieldVM && fieldVM?.value !== "") ? getDisplayValue(item.field.type)(fieldVM, valueContainer,) : valueContainer.setText("<empty>")
            } else {
                container.createDiv({ text: `${item.name} :`, cls: "label-container" })
                container.createDiv({ text: "<missing>" })
            }

        }

        async onChooseSuggestion(item: ExistingField | Field, evt: MouseEvent | KeyboardEvent) {
            const mF = this.managedField
            if (!isSingleTargeted(mF)) return
            if (item instanceof ExistingField) {
                // child field exists: go to child field
                const cF = item.field // child field
                const cFVM = fieldValueManager(mF.plugin, cF.id, cF.fileClassName, mF.target, item, item.indexedPath, undefined, undefined, undefined, this)
                if (!cFVM) return
                switch (item.field.type) {
                    case "Boolean":
                        await cFVM?.save(`${!cFVM.value}`)
                        break;
                    case "Cycle":
                        const nextOptions = getNextOption(cFVM as IFieldManager<TFile, TypesOptionsMap["Cycle"]>)
                        await cFVM.save(`${nextOptions}`)
                        break;
                    default:
                        cFVM.openModal()
                        break;
                }
            } else {
                //insert a new field
                if (item.type === "ObjectList") {
                    await postValues(mF.plugin, [{ indexedPath: `${mF.indexedPath}____${item.id}`, payload: { value: "" } }], mF.target)
                    this.open()
                } else if (item.type === "Object") {
                    await postValues(mF.plugin, [{ indexedPath: `${mF.indexedPath}____${item.id}`, payload: { value: "" } }], mF.target)
                    const cF = await Note.getExistingFieldForIndexedPath(mF.plugin, mF.target as TFile, `${mF.indexedPath}____${item.id}`)
                    fieldValueManager(mF.plugin, item.id, item.fileClassName, mF.target, cF, cF?.indexedPath, undefined, undefined, undefined, this)?.openModal()
                } else {
                    fieldValueManager(mF.plugin, item.id, item.fileClassName, mF.target, undefined, `${mF.indexedPath}____${item.id}`, undefined, undefined, undefined, this)?.openModal()
                }
            }
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    let template = managedField.options.displayTemplate
    if (!template) {
        const children = managedField.getChildren()
        const childrenNames = children.map(c => c.name)
        return childrenNames.join(", ")
    } else {
        const items: { pattern: string, value: string }[] = []
        const defaultDisplay = (pattern: string) => {
            items.push({ pattern: pattern, value: `(${pattern}?)` })
        }
        const children = managedField.getChildren()
        const childrenNames = children.map(c => c.name)
        const templatePathRegex = new RegExp(`\\{\\{(?<pattern>[^\\}]+?)\\}\\}`, "gu");
        const tP = template.matchAll(templatePathRegex)
        let next = tP.next();
        while (!next.done) {
            if (next.value.groups) {
                const pattern = next.value.groups.pattern
                if (childrenNames.includes(pattern)) {
                    const child = children.find(c => c.name === pattern)!
                    const cFVM = fieldValueManager(managedField.plugin, child.id, child.fileClassName, managedField.target, undefined, undefined)
                    if (!cFVM || !managedField.value) defaultDisplay(pattern)
                    else {
                        cFVM.value = managedField.value[child.name]
                        items.push({ pattern: pattern, value: getValueString(cFVM.type)(cFVM) })
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

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked = () => { }) {
    container.setText(valueString(managedField))
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

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined, noteField?: NoteFieldsComponent): void {
    const iconName = getIcon(field.type);
    if (noteField) {
        const action = async () => await noteField.moveToObject(`${indexedPath}`);
        if (isFieldActions(location)) {
            location.addOption(`field_${field.id}_children`, iconName, action, `Go to ${field.name}'s fields`);
        }
    } else {
        const name = field.name
        const action = async () => {
            //create an optionList for this indexedPath
            const note = await Note.buildNote(plugin, file)
            const _eF = note.existingFields.find(__eF => __eF.indexedPath === indexedPath)
            if (_eF) {
                fieldValueManager(plugin, _eF.field.id, _eF.field.fileClassName, file, _eF, _eF.indexedPath, undefined, undefined, undefined, undefined)?.openModal()
            } else {
                const fieldCommandSuggestModal = new FieldCommandSuggestModal(plugin.app)
                const optionsList = new OptionsList(plugin, file, fieldCommandSuggestModal, indexedPath)
                await optionsList.createExtraOptionList()
            }
        }
        if (isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: iconName
            });
        }
    }
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractObject.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return true
}


//#region utils

export function getPseudoObjectValueManagerFromObjectItem(managedField: IFieldManager<Target, ObjectListOptions>, item: ObjectListItem, previousModal?: ObjectListModal<Target>) {
    const mF = managedField
    const field = buildField(mF.plugin, "", "", mF.path, mF.fileClassName, undefined, undefined, undefined, "Object", {})
    const itemFVM = new (FieldValueManager(mF.plugin, field, mF.target, undefined, item.indexedPath, undefined, undefined, undefined, previousModal))
    return itemFVM
}

//#endregion