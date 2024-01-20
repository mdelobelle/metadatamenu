import { FieldType, TypesOptionsMap, fieldTypes } from "../Fields"


export type BaseOptions = {
    [key: string]: any
}

export interface IFieldBase {
    type: keyof typeof FieldType
    tagName: string,
    icon: string,
    tooltip: string,
    colorClass: string,
}

export type FieldParam = {
    [K in keyof TypesOptionsMap]: [type: K, options: TypesOptionsMap[K] | {}]
}[keyof TypesOptionsMap];

export function isFieldOptions(param: [string, Record<string, any>]): param is FieldParam {
    const _param = (param as FieldParam)
    const isTheRightOption = (options: BaseOptions): boolean => {
        return Object.keys(options).every(option => Object.keys(param[1]).includes(option))
    }
    return fieldTypes.includes(_param[0]) && isTheRightOption(_param[1])
}