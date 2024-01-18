import MetadataMenu from "main"

import { ButtonComponent, Modal, SuggestModal, TFile, TextAreaComponent, TextComponent } from "obsidian"
import { FieldCommand } from "./_Field"
import { MultiDisplayType } from "src/types/fieldTypes"
import { FieldStyleLabel } from "src/types/dataviewTypes"
import cryptoRandomString from "crypto-random-string"
import { LineNode } from "src/note/lineNode"
import GField from "src/fields/_Field"
import FieldSettingsModal from "src/settings/FieldSettingsModal"
import { getFieldClass, getFieldModal, getFieldType } from "./Fields"
import { FieldParam, FieldType, IFieldBase, Options, isFieldOptions, multiTypes, objectTypes, rootOnlyTypes } from "./BaseField"
import { postValues } from "src/commands/postValues"

// Field Types list agnostic

export type Constructor<T> = new (...args: any[]) => T;

//#region Field

type FieldStyle = Record<keyof typeof FieldStyleLabel, boolean>

export interface IField extends IFieldBase {
    plugin: MetadataMenu
    name: string
    id: string
    path: string
    options: Options
    fileClassName?: string
    command?: FieldCommand
    display?: MultiDisplayType
    style?: FieldStyle
    isRoot(): boolean
    getDisplay(): MultiDisplayType
    getIndexedPath(node: LineNode): string
    getChildren(): IField[]
    getFirstAncestor(): IField | undefined
    getDottedPath(): string
    hasIdAsAncestor(childId: string): boolean
    getCompatibleParents(): IField[]
    getAncestors(fieldId: string): IField[]
    getIndentationLevel(node: LineNode): number
    isFirstItemOfObjectList(node: LineNode): boolean
    getOtherObjectTypeFields(): IField[]
    validateName(textInput: TextComponent, contentEl: Element): boolean
    validateOptions(): boolean
}



export function field<B extends Constructor<IFieldBase>, O extends Options>(
    plugin: MetadataMenu,
    Base: B,
    name: string = "",
    id: string = "",
    path: string = "",
    options?: O,
    fileClassName?: string,
    command?: FieldCommand,
    display?: MultiDisplayType,
    style?: FieldStyle
): Constructor<IField> {
    return class Field extends Base {
        public plugin: MetadataMenu
        public options: O | {}
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
            this.options = options || {}
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

        public getChildren(): IField[] {
            if (this.fileClassName) {
                return (
                    this.plugin.fieldIndex.fileClassesName
                        .get(this.fileClassName)?.attributes
                        .map(attr => attr.getIField())
                        .filter(f => !!f) as IField[]
                )
                    .filter(f => f.path.split("____").last() === this.id) || []
            } else {
                return Field.presetFields(this.plugin).filter(f => f.path.split("____").last() === this.id)
            }
        }

        public getFirstAncestor(): IField | undefined {
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

        public getCompatibleParents(): IField[] {
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

        public getAncestors(fieldId: string = this.id): IField[] {
            const field = getField(fieldId, this.fileClassName, this.plugin)
            const ancestors: IField[] = []
            if (!field || !field.path) return ancestors

            const ancestorsIds = field.path.split("____")
            for (const id of ancestorsIds) {
                const ancestor = getField(id, this.fileClassName, this.plugin)
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

        public getOtherObjectTypeFields(): IField[] {
            let objectFields: GField[]
            if (this.fileClassName) {
                const index = this.plugin.fieldIndex
                objectFields = index.fileClassesFields
                    .get(this.fileClassName)?.filter(field => objectTypes.includes(field.type) && field.id !== this.id) || []
            } else {
                objectFields = this.plugin.presetFields
                    .filter(field => objectTypes.includes(field.type) && field.id !== this.id)
            }
            return objectFields.map(f => getField(f.id, f.fileClassName, plugin)).filter(iF => !!iF) as IField[]
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

        //TODO validateOptions is a fieldBase prop
        public validateOptions(): boolean {
            return true;
        }

        static createDefault(plugin: MetadataMenu, name: string): IField {
            const field = new Field(plugin);
            field.type = "Input";
            field.name = name;
            return field;
        }

        static existingFields(plugin: MetadataMenu, filePath: string, obj: any, depth: number = 0, path: string = ""): IField[] {
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
            const _existingFields: IField[] = []
            if (typeof obj === 'object') {
                for (const key of obj) {
                    if (depth === 0 && reservedKeys.includes(key)) continue;
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        _existingFields.push(...Field.existingFields(plugin, filePath, obj[key], depth + 1, `${path ? path + "." : ""}${key}`).filter(k => !_existingFields.includes(k)))
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

        static getIdAndIndex(indexedId?: string) {
            const { id, index } = indexedId?.match(/(?<id>[^\[]*)(?:\[(?<index>.*)\])?/)?.groups || { id: "", index: undefined }
            return { id, index }
        }

        static upperPath(indexedPath: string): string {
            const upperIndexedIds = indexedPath?.split("____")
            upperIndexedIds?.pop()
            return upperIndexedIds?.join("____") || ""
        }

        static upperIndexedPathObjectPath(indexedPath: string) {
            const endingIndex = indexedPath.match(/\[\w+\]$/)
            if (endingIndex) {
                return indexedPath.replace(/\[\w+\]$/, '')
            } else {
                return Field.upperPath(indexedPath)
            }
        }

        static getValueFromIndexedPath(carriageField: IField, obj: any, indexedPath: string): any {
            //fonction récursive qui part du frontmatter et qui cherche la valeur correspondant à l'indexedPath
            //l'argument field sert à récupérer la fileclass et à récupérer l'attribute plugin

            if (!indexedPath) return obj;
            const plugin = carriageField.plugin
            const fileClassName = carriageField.fileClassName
            const indexedProps: string[] = indexedPath.split('____');

            try {
                const indexedProp = indexedProps.shift()!
                // on récupère l'id et l'éventuel index
                const { id, index } = Field.getIdAndIndex(indexedProp)
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
                    const subValue = Field.getValueFromIndexedPath(field, value, indexedProps.join("____"))
                    return subValue
                } else if (Array.isArray(value)) {
                    if (index && !isNaN(parseInt(index))) {
                        // on récupère l'élément à l'index voulu.
                        // par construction c'est un obj...
                        const subObject = value[parseInt(index)]
                        const subValue = Field.getValueFromIndexedPath(field, subObject, indexedProps.join("____"))
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

        static presetFields(plugin: MetadataMenu): IField[] {
            return plugin.presetFields.map(prop => {
                const property = new Field(plugin);
                return Object.assign(property, prop);
            });
        }

        static getValueFromPath(obj: any, path: string): string {
            if (!path) return obj;
            const properties: string[] = path.split('.');
            try {
                const subValue = Field.getValueFromPath(obj[properties.shift()!], properties.join('.'))
                return subValue
            } catch (e) {
                return ""
            }
        }
    }
}

export function buildField(plugin: MetadataMenu, name: string, id: string, path: string, fileClassName?: string, command?: FieldCommand, display?: MultiDisplayType, style?: FieldStyle, ...[type, options]: FieldParam): Constructor<IField> {
    const _field = field(plugin, getFieldClass(type), name, id, path, options, fileClassName, command, display, style)
    return _field
}


export function exportIField(field: IField): GField {
    const _field = new GField(field.plugin)
    _field.id = field.id
    _field.type = getFieldType(field.type)
    _field.name = field.name
    _field.fileClassName = field.fileClassName
    _field.command = field.command
    _field.display = field.display
    _field.options = field.options
    _field.path = field.path
    _field.style = field.style
    return _field
}

export function getFieldConstructor(id: string, fileClassName: string | undefined, plugin: MetadataMenu): [Constructor<IField>, FieldType] | [] {
    if (fileClassName) {
        const index = plugin.fieldIndex
        const fCF = index.fileClassesFields
            .get(fileClassName)?.find(field => field.id === id)
        if (!fCF) return []
        const { type, options, command, style, display } = fCF
        if (isFieldOptions([type as FieldType, options])) {
            return [buildField(plugin, fCF.name, fCF.id, fCF.path, fileClassName, command, display, style, ...[type, options] as FieldParam), type as FieldType]
        }
    } else {
        const fS = plugin.settings.presetFields.find(f => f.id === id)
        if (!fS) return []
        const { type, options, command, style, display } = fS
        if (isFieldOptions([type, options])) {
            return [buildField(plugin, fS.name, fS.id, fS.path, undefined, command, display, style, ...[type, options] as FieldParam), type as FieldType]
        }
    }
    return []
}

export function getField(id: string, fileClassName: string | undefined, plugin: MetadataMenu): IField | undefined {
    const [constructor] = getFieldConstructor(id, fileClassName, plugin)
    if (constructor) {
        return new constructor()
    }
}

export function copyProperty(target: IField, source: IField): void {
    target.id = source.id;
    target.name = source.name;
    target.type = source.type
    Object.keys(source.options).forEach(k => {
        target.options[k] = source.options[k];
    });
    Object.keys(target.options).forEach(k => {
        if (!Object.keys(source.options).includes(k)) {
            delete target.options[k];
        };
    });
    target.command = source.command
    target.display = source.display
    target.style = source.style
    target.path = source.path
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
//#endregion

export interface IManagedField<T> extends IField {
    target: T
    value: any
    openModal: () => void;
    update: () => void
}

export type Target =
    TFile |
    TFile[]

export function isSingleTargeted(managedField: IManagedField<Target>): managedField is IManagedField<TFile> {
    return managedField.target instanceof TFile
}

export function isMultiTargeted(managedField: IManagedField<Target>): managedField is IManagedField<TFile[]> {
    const target = managedField.target
    return Array.isArray(target) && target.every(t => t instanceof TFile)
}

function FieldValueManager<F extends Constructor<IField>>(
    Base: F,
    target: Target,
    value: any,
    plugin: MetadataMenu
): Constructor<IManagedField<Target>> {
    return class ManagedField extends Base {
        private _modal: IBaseValueModal<Target>
        public target: Target
        public value: any
        constructor(...rest: any[]) {
            super()
            this.target = target
            this.value = value
        }
        public openModal() {
            this.modal.open()
        }

        private get modal() {
            this._modal = getFieldModal(this, plugin)
            return this._modal
        }

        public update() {
            if (isSingleTargeted(this)) {
                postValues(plugin, [{ indexedPath: this.id, payload: { value: this.value } }], this.target)
            } else if (isMultiTargeted(this)) {
                for (const target of this.target) {
                    postValues(plugin, [{ indexedPath: this.id, payload: { value: this.value } }], target)
                }
            }
        }
    }
}


export function buildFieldValueManager(field: Constructor<IField>, target: Target, value: any, plugin: MetadataMenu): IManagedField<Target> {
    return new (FieldValueManager(field, target, value, plugin))()
}

//#endregion

//#region Modals

/*
** Modals to change the value of a managedField
*/

interface IBaseValueModal<T extends Target> extends Modal {
    managedField: IManagedField<T>
}

interface IListBasedModal<T extends Target> extends IBaseValueModal<T> {
}

interface IBasicModal<T extends Target> extends IBaseValueModal<T> {
    targetDisplayContainer: HTMLDivElement
    valueModifierContainer: HTMLDivElement

}

export type ModalType =
    IBasicModal<Target> |
    IListBasedModal<Target>

export function basicModal(managedField: IManagedField<Target>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    return class BaseValueModal extends Modal {
        public managedField: IManagedField<Target>
        public targetDisplayContainer: HTMLDivElement
        public valueModifierContainer: HTMLDivElement
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(this.managedField.name)
            this.targetDisplayContainer = this.contentEl.createDiv()
            this.valueModifierContainer = this.contentEl.createDiv()
            this.buildActions()
            this.buildValueModifier()
            this.displayTarget()
        }

        displayTarget() {
            if (isSingleTargeted(this.managedField)) {
                this.targetDisplayContainer.setText(this.managedField.target.basename)
            } else if (isMultiTargeted(this.managedField)) {
                this.targetDisplayContainer.setText(this.managedField.target.map(f => f.basename).join(", "))
            }
        }

        buildValueModifier() {
            new TextComponent(this.valueModifierContainer)
                .setValue(this.managedField.value)
                .onChange((value) => {
                    this.managedField.value = value
                })
        }

        buildActions() {

            new ButtonComponent(this.contentEl)
                .setIcon("save")
                .onClick(() => {
                    this.save()
                    this.close()
                })
        }
        save() { managedField.update() }
    }
}


export function listBasedModal(managedField: IManagedField<Target>, plugin: MetadataMenu): Constructor<IListBasedModal<Target>> {
    return class BaseValueModal extends SuggestModal<string> {

        public managedField: IManagedField<Target>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
        }
        getSuggestions(query: string): string[] | Promise<string[]> {
            return Object.values(this.managedField.options.values)
        }
        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
        }
        onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
            this.managedField.value = item
            managedField.update()
        }
    }
}


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

//#endregion