import MetadataMenu from "main"

import { Menu, TFile, TextAreaComponent, TextComponent } from "obsidian"
import { FieldCommand } from "./_Field"
import { MultiDisplayType } from "src/types/fieldTypes"
import { FieldStyleLabel } from "src/types/dataviewTypes"
import cryptoRandomString from "crypto-random-string"
import { LineNode } from "src/note/lineNode"
import GField from "src/fields/_Field"
import FCSM from "src/options/FieldCommandSuggestModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal"
import { FieldType, getFieldModal, multiTypes, objectTypes, rootOnlyTypes, getFieldClass, mapLegacyFieldType, getDefaultOptions } from "./Fields"
import { FieldParam, IFieldBase, BaseOptions, isFieldOptions } from "./base/BaseField"
import { postValues } from "src/commands/postValues"
import { IBaseValueModal, MultiTargetModificationConfirmModal } from "./base/BaseModal"
import { ExistingField } from "./ExistingField"
import ObjectModal from "src/modals/fields/ObjectModal"
import ObjectListModal from "src/modals/fields/ObjectListModal"
import { Constructor } from "src/typings/types"
import { FieldActions } from "src/components/FieldsModal"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import { Modal as IObjectBaseModal } from "./models/abstractModels/AbstractObject"

// Field Types list agnostic

//export type Constructor<T> = new (...args: any[]) => T;

//#region Field

type FieldStyle = Record<keyof typeof FieldStyleLabel, boolean>

export interface IField<O extends BaseOptions> extends IFieldBase {
    // a field base with a name, an id, options, a fileclass name....
    plugin: MetadataMenu
    name: string
    id: string
    path: string
    options: O
    fileClassName?: string
    command?: FieldCommand
    display?: MultiDisplayType
    style?: FieldStyle
    isRoot(): boolean
    getDisplay(): MultiDisplayType
    getIndexedPath(node: LineNode): string
    getChildren(): IField<O>[]
    getFirstAncestor(): IField<O> | undefined
    getDottedPath(): string
    hasIdAsAncestor(childId: string): boolean
    getCompatibleParents(): IField<O>[]
    getAncestors(fieldId: string): IField<O>[]
    getIndentationLevel(node: LineNode): number
    isFirstItemOfObjectList(node: LineNode): boolean
    getOtherObjectTypeFields(): IField<O>[]
    validateName(textInput: TextComponent, contentEl: Element): boolean
}

export function field<B extends Constructor<IFieldBase>, O extends BaseOptions>(
    plugin: MetadataMenu,
    Base: B,
    name: string = "",
    id: string = "",
    path: string = "",
    options: O,
    fileClassName?: string,
    command?: FieldCommand,
    display?: MultiDisplayType,
    style?: FieldStyle
): Constructor<IField<O>> {
    /*
    ** Get a Field Base and creates a field with 
    ** - related options
    */
    return class Field extends Base {
        public plugin: MetadataMenu
        public options: O
        public name: string
        public id: string
        public path: string
        public fileClassName?: string
        public command?: FieldCommand
        public display?: MultiDisplayType
        public style?: FieldStyle
        constructor(...rest: any[]) {
            super()
            this.plugin = plugin
            if (!isFieldOptions([this.type, options])) throw Error("This type isn't compatible with these options")
            this.options = options
            this.name = name
            this.id = id
            this.path = path
            this.fileClassName = fileClassName
            this.command = command
            this.display = display
            this.style = style
        }
        public isRoot(): boolean {
            return this.path === ""
        }

        public getDisplay(): MultiDisplayType {
            if (multiTypes.includes(this.type)) {
                return this.display || this.plugin.settings.frontmatterListDisplay
            } else {
                return MultiDisplayType.asArray
            }
        }

        public getIndexedPath(node: LineNode): string {
            if (this.path === "") return node.indexedId
            const parentNode = node.line.parentLine?.nodes[0]
            const parentField = parentNode?.field
            if (parentField) {
                const parentIndexedPath = parentField.getIndexedPath(parentNode)
                return `${parentIndexedPath}${parentIndexedPath ? "____" : ""}${node.indexedId}`
            } else {
                return ""
            }

        }

        public getChildren(): IField<O>[] {
            if (this.fileClassName) {
                return (
                    this.plugin.fieldIndex.fileClassesName
                        .get(this.fileClassName)?.attributes
                        .map(attr => attr.getIField())
                        .filter(f => !!f) as IField<O>[]
                )
                    .filter(f => f.path.split("____").last() === this.id) || []
            } else {
                return Field.presetFields(this.plugin).filter(f => f.path.split("____").last() === this.id)
            }
        }

        public getFirstAncestor(): IField<O> | undefined {
            const ancestors = this.getAncestors()
            return ancestors.last()
        }

        public getDottedPath(): string {
            if (!this.path) return this.name
            const upperDottedPath = this.path.split("____").map(id => getField(id, this.fileClassName, this.plugin)?.name).join(".")
            return `${upperDottedPath}.${this.name}`
        }

        public hasIdAsAncestor(childId: string): boolean {
            if (!this.path) {
                return false
            } else {
                const parentId = this.path.split("____").last()!
                if (parentId === childId) {
                    return true;
                } else {
                    const field = getField(parentId, this.fileClassName, this.plugin)
                    return field?.hasIdAsAncestor(childId) || false

                }
            }
        }

        public getCompatibleParents(): IField<O>[] {
            //Lookups, Formulas and Canvas can't accept objectList as parent
            //because their value depends on outer change that can't know which
            //index they would need to change
            const otherObjectFields = this.getOtherObjectTypeFields()
            if (objectTypes.includes(this.type)) {
                return otherObjectFields
            } else {
                const compatibleParents = otherObjectFields
                    .filter(_field => {
                        const field = getField(_field.id, this.fileClassName, this.plugin)
                        return !field?.hasIdAsAncestor(this.id)

                    }).filter(_f =>
                        !rootOnlyTypes.includes(this.type)
                    )
                return compatibleParents
            }
        }

        public getAncestors(fieldId: string = this.id): IField<O>[] {
            const field = getField(fieldId, this.fileClassName, this.plugin)
            const ancestors: IField<O>[] = []
            if (!field || !field.path) return ancestors

            const ancestorsIds = field.path.split("____")
            for (const id of ancestorsIds) {
                const ancestor = getField<O>(id, this.fileClassName, this.plugin)
                if (ancestor) ancestors.push(ancestor)
            }
            return ancestors
        }

        public getIndentationLevel(node: LineNode): number {
            const ancestors = this.getAncestors();
            let level: number = 0
            ancestors.forEach(ancestor => {
                level = ancestor.type === "ObjectList" ? level + 2 : level + 1
            })
            if (this.isFirstItemOfObjectList(node)) level = level - 1
            return level
        }

        public isFirstItemOfObjectList(node: LineNode): boolean {
            const ancestors = this.getAncestors(this.id)
            if (ancestors.last()?.type === "ObjectList") {
                const indentRegex = new RegExp(/(?<indentation>\s*)(?<list>-\s)?.*/)
                const fR = node.rawContent.match(indentRegex);
                if (fR?.groups?.list) {
                    return true
                }
            }
            return false
        }

        public getOtherObjectTypeFields(): IField<O>[] {
            let objectFields: LegacyField[]
            if (this.fileClassName) {
                const index = this.plugin.fieldIndex
                objectFields = index.fileClassesFields
                    .get(this.fileClassName)?.filter(field => objectTypes.includes(field.type) && field.id !== this.id) || []
            } else {
                objectFields = this.plugin.presetFields
                    .filter(field => objectTypes.includes(field.type) && field.id !== this.id)
            }
            return objectFields.map(f => getField(f.id, f.fileClassName, plugin)).filter(iF => !!iF) as IField<O>[]
        }

        public validateName(textInput: TextComponent, contentEl: Element): boolean {
            let error = false;
            if (/^[#>-]/.test(this.name)) {
                FieldSettingsModal.setValidationError(
                    textInput,
                    "Field name cannot start with #, >, -"
                );
                error = true;
            };
            if (this.name == "") {
                FieldSettingsModal.setValidationError(
                    textInput,
                    "Field name can not be Empty"
                );
                error = true;
            };
            if (this.fileClassName) {
                const fields = this.plugin.fieldIndex.fileClassesFields
                    .get(this.fileClassName)?.filter(_f => _f.path === this.path && _f.id !== this.id && _f.fileClassName === this.fileClassName)
                if (fields?.map(_f => _f.name).includes(this.name)) {
                    FieldSettingsModal.setValidationError(
                        textInput,
                        `There is already a field with this name for this path in this ${this.plugin.settings.fileClassAlias}. Please choose another name`
                    );
                    error = true;
                }
            } else {
                const fields = this.plugin.presetFields.filter(_f => _f.path === this.path && _f.id !== this.id)
                if (fields?.map(_f => _f.name).includes(this.name)) {
                    FieldSettingsModal.setValidationError(
                        textInput,
                        "There is already a field with this name for this path in presetFields. Please choose another name"
                    );
                    error = true;
                }
            }
            return !error
        }

        public validateOptions(): boolean {
            return true;
        }

        static createDefault(plugin: MetadataMenu, name: string): Field {
            const field = new Field(plugin);
            field.type = "Input";
            field.name = name;
            return field;
        }

        static presetFields(plugin: MetadataMenu): IField<O>[] {
            return plugin.presetFields.map(prop => {
                const property = new Field(plugin);
                return Object.assign(property, prop);
            });
        }
    }
}

export function buildField<O extends BaseOptions>(
    plugin: MetadataMenu,
    name: string,
    id: string,
    path: string,
    fileClassName?: string,
    command?: FieldCommand,
    display?: MultiDisplayType,
    style?: FieldStyle,
    ...[type, options]: FieldParam
): Constructor<IField<O>> {
    const base = getFieldClass(type)
    const _field = field<typeof base, O>(plugin, base, name, id, path, options as O, fileClassName, command, display, style)
    return _field
}

export function buildEmptyField<O extends BaseOptions>(plugin: MetadataMenu, fileClassName: string | undefined, type: FieldType): Constructor<IField<O>> {
    return buildField<O>(plugin, "", "", "", fileClassName, undefined, undefined, undefined, type, getDefaultOptions(type))
}

export function getOptions<O extends BaseOptions>(field: IField<O> | IFieldManager<Target, O>): O {
    const options = field.options
    if (
        Object.keys(options).length === 0 &&
        options.constructor === Object
    ) {
        //TODO fix the casting of getDefaultOptions. try to get if from getDefaultOptions
        return getDefaultOptions(field.type) as O
    } else {
        return field.options as O
    }
}

export function exportIField<O extends BaseOptions>(field: IField<O>): LegacyField {

    const _field = new GField(field.plugin)
    _field.id = field.id
    _field.type = mapLegacyFieldType(field.type)
    _field.name = field.name
    _field.fileClassName = field.fileClassName
    _field.command = field.command
    _field.display = field.display
    _field.options = field.options
    _field.path = field.path
    _field.style = field.style
    return _field
}

export function getFieldConstructor<O extends BaseOptions>(id: string, fileClassName: string | undefined, plugin: MetadataMenu): [Constructor<IField<O>>, FieldType] | [] {
    if (fileClassName) {
        const index = plugin.fieldIndex
        const fCF = index.fileClassesFields
            .get(fileClassName)?.find(field => field.id === id)
        if (!fCF) return []

        if (isFieldOptions([fCF.type as FieldType, fCF.options])) {
            const { name, id, path, command, display, style, type, options } = fCF
            return [buildField(plugin, name, id, path, fileClassName, command, display, style, ...[type, options] as FieldParam), type as FieldType]
        }
    } else {
        const fS = plugin.settings.presetFields.find(f => f.id === id)
        if (!fS) return []

        if (isFieldOptions([fS.type, fS.options])) {
            const { name, id, path, command, display, style, type, options } = fS
            return [buildField(plugin, name, id, path, undefined, command, display, style, ...[type, options] as FieldParam), type as FieldType]
        }
    }
    return []
}

export function getField<O extends BaseOptions>(id: string, fileClassName: string | undefined, plugin: MetadataMenu): IField<O> | undefined {
    const [constructor] = getFieldConstructor<O>(id, fileClassName, plugin)
    if (constructor) {
        return new constructor()
    }
}

export function copyProperty<O extends BaseOptions>(target: IField<O>, source: IField<O>): void {
    const unbound = (value: any) => value ? JSON.parse(JSON.stringify(value)) : ""
    target.id = unbound(source.id);
    target.name = unbound(source.name);
    target.type = unbound(source.type)
    target.options = unbound(source.options)
    target.command = unbound(source.command)
    target.display = unbound(source.display)
    target.style = unbound(source.style)
    target.path = unbound(source.path)
};

export function getNewFieldId(plugin: MetadataMenu) {
    const index = plugin.fieldIndex
    const ids: string[] = [];
    for (const fileClassFields of index.fileClassesFields.values()) {
        for (const field of fileClassFields) {
            ids.push(field.id)
        }
    }
    for (const field of plugin.presetFields) {
        ids.push(field.id)
    }
    let id = cryptoRandomString({ length: 6, type: "alphanumeric" })
    while (ids.includes(id)) {
        id = cryptoRandomString({ length: 6, type: "alphanumeric" })
    }
    return id
}

export function upperIndexedPathObjectPath(indexedPath: string) {
    const endingIndex = indexedPath.match(/\[\w+\]$/)
    if (endingIndex) {
        return indexedPath.replace(/\[\w+\]$/, '')
    } else {
        return upperPath(indexedPath)
    }
}

export function upperPath(indexedPath: string): string {
    const upperIndexedIds = indexedPath?.split("____")
    upperIndexedIds?.pop()
    return upperIndexedIds?.join("____") || ""
}

export function createDefault<O extends BaseOptions>(plugin: MetadataMenu, name: string): IField<O> {
    throw Error("Not implemented")
    //should return a input without id ....
}

export function existingFields<O extends BaseOptions>(plugin: MetadataMenu, filePath: string, obj: any, depth: number = 0, path: string = ""): IField<O>[] {
    const reservedKeys = ["file", "aliases", "tags"]
    let _obj: any
    if (depth === 0) {
        const dvApi = plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            _obj = dvApi.page(filePath)
        } else {
            return []
        }
    } else {
        _obj = obj
    }
    const _existingFields: IField<O>[] = []
    if (typeof obj === 'object') {
        for (const key of obj) {
            if (depth === 0 && reservedKeys.includes(key)) continue;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                _existingFields.push(...existingFields<O>(plugin, filePath, obj[key], depth + 1, `${path ? path + "." : ""}${key}`).filter(k => !_existingFields.includes(k)))
            } else if (!_existingFields.map(k => k.name.toLowerCase().replace(/\s/g, "-")).includes(key.toLowerCase().replace(/\s/g, "-"))) {
                _existingFields.push(key)
            } else {
                if (key !== key.toLowerCase().replace(/\s/g, "-")) {
                    _existingFields[_existingFields.indexOf(key.toLowerCase().replace(/\s/g, "-"))] = key
                }
            }
        }
    }
    return _existingFields
}

export function getIdAndIndex(indexedId?: string) {
    const { id, index } = indexedId?.match(/(?<id>[^\[]*)(?:\[(?<index>.*)\])?/)?.groups || { id: "", index: undefined }
    return { id, index }
}

export function getValueFromIndexedPath<O extends BaseOptions>(carriageField: IField<O>, obj: any, indexedPath: string): any {
    //fonction récursive qui part du frontmatter et qui cherche la valeur correspondant à l'indexedPath
    //l'argument field sert à récupérer la fileclass et à récupérer l'attribute plugin

    if (!indexedPath) return obj;
    const plugin = carriageField.plugin
    const fileClassName = carriageField.fileClassName
    const indexedProps: string[] = indexedPath.split('____');

    try {
        const indexedProp = indexedProps.shift()!
        // on récupère l'id et l'éventuel index
        const { id, index } = getIdAndIndex(indexedProp)
        // on récupère la définition du field selon son id et sa fileClass
        const field = getField(id, fileClassName, plugin)
        if (!field) return "" // s'il n'existe pas, on renvoie vide
        let value: any
        if (index !== undefined) {
            value = obj[field.name][index]
        } else {
            value = obj[field.name]
        }
        if (typeof value === 'object') {
            // value est un object, on continue à inspecter
            const subValue = getValueFromIndexedPath(field, value, indexedProps.join("____"))
            return subValue
        } else if (Array.isArray(value)) {
            if (index && !isNaN(parseInt(index))) {
                // on récupère l'élément à l'index voulu.
                // par construction c'est un obj...
                const subObject = value[parseInt(index)]
                const subValue = getValueFromIndexedPath(field, subObject, indexedProps.join("____"))
                return subValue
            } else {
                // c'est "juste" un tableau
                // par construction il ne peut pas y avoir sur subProps
                // on le renvoie telquel
                return value
            }
        } else {
            // ni dans le cas d'un sous-objet, ni dans le cas d'une liste de sous objets, on renvoie la value
            return value
        }
    } catch (e) {
        return ""
    }
}

export function getValueFromPath(obj: any, path: string): string {
    if (!path) return obj;
    const properties: string[] = path.split('.');
    try {
        const subValue = getValueFromPath(obj[properties.shift()!], properties.join('.'))
        return subValue
    } catch (e) {
        return ""
    }
}

//#endregion

//#region FieldValueManager

export interface LegacyField extends GField { }

export type ActionLocation = Menu | FieldCommandSuggestModal | FieldActions

export interface IFieldManager<T, O extends BaseOptions> extends IField<O> {
    target: T
    value: any
    eF?: ExistingField,
    indexedPath?: string,
    lineNumber?: number,
    asList?: boolean,
    asBlockquote?: boolean,
    previousModal?: IObjectBaseModal<Target>
    openModal: () => void;
    save: (value?: any) => void
}

export type Target =
    TFile |
    TFile[]

export function isSingleTargeted<O extends BaseOptions>(managedField: IFieldManager<Target, O>): managedField is IFieldManager<TFile, O> {
    return managedField.target instanceof TFile
}

export function isMultiTargeted<O extends BaseOptions>(managedField: IFieldManager<Target, O>): managedField is IFieldManager<TFile[], O> {
    const target = managedField.target
    return Array.isArray(target) && target.every(t => t instanceof TFile)
}

export function isSuggest(location: Menu | "InsertFieldCommand" | FCSM | FieldActions): location is FCSM {
    return (location as FCSM).getItems !== undefined;
};

export function isInsertFieldCommand(location: Menu | "InsertFieldCommand" | FCSM | FieldActions): location is "InsertFieldCommand" {
    return (location as string) === "InsertFieldCommand";
}

export function isFieldActions(location: Menu | "InsertFieldCommand" | FCSM | FieldActions): location is FieldActions {
    return (location as FieldActions).addOption !== undefined;
}

function FieldValueManager<O extends BaseOptions, F extends Constructor<IField<O>>>(
    plugin: MetadataMenu,
    Base: F,
    target: Target,
    existingField: ExistingField | undefined,
    indexedPath?: string,
    lineNumber?: number,
    asList?: boolean,
    asBlockquote?: boolean,
    previousModal?: IObjectBaseModal<Target>
): Constructor<IFieldManager<Target, O>> {
    return class ManagedField extends Base {
        private _modal: IBaseValueModal<Target> | undefined
        public target: Target
        public value: any
        public eF?: ExistingField
        public indexedPath?: string
        public lineNumber?: number = -1
        public asList?: boolean = false
        public asBlockquote?: boolean = false
        public previousModal?: IObjectBaseModal<Target>
        constructor(...rest: any[]) {
            super(plugin)
            this.target = target
            this.eF = existingField
            this.value = this.eF?.value
            this.indexedPath = indexedPath
            this.lineNumber = lineNumber
            this.asList = asList
            this.asBlockquote = asBlockquote
            this.previousModal = previousModal
        }
        public openModal() {
            this.modal?.open()
        }

        private get modal() {
            this._modal = getFieldModal(this, plugin)
            return this._modal
        }

        public save(value?: any) {
            if (value !== undefined) this.value = value
            if (isSingleTargeted(this)) {
                postValues(plugin, [{ indexedPath: this.indexedPath || this.id, payload: { value: this.value } }], this.target, this.lineNumber, this.asList, this.asBlockquote)
            } else if (isMultiTargeted(this)) {
                new MultiTargetModificationConfirmModal(this).open()
            }
        }
    }
}

export function fieldValueManager<O extends BaseOptions>(
    plugin: MetadataMenu,
    id: string,
    fileClassName: string | undefined,
    target: Target,
    existingField: ExistingField | undefined,
    indexedPath?: string,
    lineNumber?: number,
    asList?: boolean,
    asBlockquote?: boolean,
    previousModal?: IObjectBaseModal<Target>
): IFieldManager<Target, O> | undefined {
    const [field] = getFieldConstructor<O>(id, fileClassName, plugin)
    if (!field) return
    return new (FieldValueManager<O, Constructor<IField<O>>>(
        plugin,
        field,
        target,
        existingField,
        indexedPath,
        lineNumber,
        asList,
        asBlockquote,
        previousModal
    ))()
}

//#endregion

//#region utils

export function setValidationError(textInput: TextComponent, message?: string) {
    textInput.inputEl.addClass("is-invalid");
    const fieldContainer = textInput.inputEl.parentElement;
    const fieldsContainer = fieldContainer?.parentElement;
    if (message && fieldsContainer) {
        let mDiv = fieldsContainer.querySelector(".field-error") as HTMLDivElement;
        if (!mDiv) mDiv = createDiv({ cls: "field-error" });
        mDiv.innerText = message;
        fieldsContainer.insertBefore(mDiv, fieldContainer);
    }
}
export function removeValidationError(textInput: TextComponent | TextAreaComponent) {
    if (textInput.inputEl.hasClass("is-invalid")) textInput.inputEl.removeClass("is-invalid");
    const fieldContainer = textInput.inputEl.parentElement;
    const fieldsContainer = fieldContainer?.parentElement;
    const fieldError = fieldsContainer?.querySelector(".field-error")
    if (fieldError) fieldsContainer!.removeChild(fieldError)
};

export function baseDisplayValue<O extends BaseOptions>(managedField: IFieldManager<Target, O>, container: HTMLDivElement, onClicked = () => { }) {
    let valueText: string;
    switch (managedField.value) {
        case undefined: valueText = ""; break;
        case null: valueText = ""; break;
        case false: valueText = "false"; break;
        case 0: valueText = "0"; break;
        default: valueText = managedField.value.toString() || "";
    }
    container.createDiv({ text: `<P> ${valueText}` })
}

export function stringToBoolean(value: string): boolean {
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

//#endregion