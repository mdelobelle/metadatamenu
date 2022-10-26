export enum Type {
    "ValuesList" = "ValuesList",
    "ValuesListNotePath" = "ValuesListNotePath",
    "ValuesFromDVQuery" = "ValuesFromDVQuery"
}

export const Key: Record<keyof typeof Type, string> = {
    "ValuesList": "valuesList",
    "ValuesListNotePath": "valuesListNotePath",
    "ValuesFromDVQuery": "valuesFromDVQuery"
}

export const typeDisplay: Record<keyof typeof Type, string> = {
    "ValuesList": "Values defined in these settings",
    "ValuesListNotePath": "Values from a note",
    "ValuesFromDVQuery": "Values returned from a dataview query"
}