import { IManagedField, Target } from "./Field"
import { TypesOptionsMap } from "./Fields"
import MetadataMenu from "main"

export const fieldTypes: Array<keyof typeof FieldType> = [
    "Input",
    "Select",
    "Multi",
    "Formula",
    "ObjectList"
]

export const multiTypes = [
    "Multi"
]

export const objectTypes = [
    "Object",
    "ObjectList"
]
export const frontmatterOnlyTypes = [
    "YAML",
    "Object",
    "ObjectList"
]

export const rootOnlyTypes = [
    "Canvas",
    "CanvasGroup",
    "CanvasGroupLink",
    "Lookup",
    "Formula"
]

export enum FieldType {
    'Input' = "Input",
    'Select' = "Select",
    'Multi' = "Multi",
    "Formula" = "Formula",
    "ObjectList" = "ObjectList"
}

export type Options = Record<string, any>

export interface IFieldBase {
    type: keyof typeof FieldType
    tagName: string,
    icon: string,
}

export abstract class FieldBase implements IFieldBase {
    abstract type: keyof typeof FieldType
    abstract tagName: string
    abstract icon: string
}


export type FieldParam = {
    [K in keyof TypesOptionsMap]: [type: K, options: TypesOptionsMap[K]]
}[keyof TypesOptionsMap];

export function isFieldOptions(param: [string, Record<string, any>]): param is FieldParam {
    const _param = (param as FieldParam)
    const isTheRightOption = (options: Options): boolean => {
        return Object.keys(options).every(option => Object.keys(param[1]).includes(option))
    }
    return fieldTypes.includes(_param[0]) && isTheRightOption(_param[1])
}