export enum BuiltinSummarizing {
    "Sum" = "Sum",
    "Count" = "Count",
    "CountAll" = "CountAll",
    "Average" = "Average"
}

export const BuiltinSummarizingFunctionDescription: Record<keyof typeof BuiltinSummarizing, string> = {
    "Sum": "Returns the sum of <{{summarizedFieldName}}> fields in the pages matching the query",
    "Count": "Counts all pages matching the query where <{{summarizedFieldName}}> is non empty",
    "CountAll": "Counts all pages matching the query (including empty fields)",
    "Average": "Returns the average value of <{{summarizedFieldName}}> fields in the pages matching the query"
}

export const BuiltinSummarizingFunction: Record<keyof typeof BuiltinSummarizing, string> = {
    "Sum": "const i=0;const sum = pages.reduce((p, c) => p + c[\"{{summarizedFieldName}}\"], i); return sum",
    "CountAll": "return pages.length",
    "Count": "return pages.filter(p => !!p[\"{{summarizedFieldName}}\"]).length",
    "Average": "const i=0.0;const sum = pages.reduce((p, c) => p + c[\"{{summarizedFieldName}}\"], i); return sum / pages.length"
}

export enum Type {
    "LinksList" = "LinksList",
    "BuiltinSummarizing" = "BuiltinSummarizing",
    "CustomList" = "CustomList",
    "CustomSummarizing" = "CustomSummarizing"
}

export const MappingLabel: Record<keyof typeof Type, Type> = {
    "LinksList": Type.LinksList,
    "BuiltinSummarizing": Type.BuiltinSummarizing,
    "CustomList": Type.CustomList,
    "CustomSummarizing": Type.CustomSummarizing
}

export const Description: Record<keyof typeof Type, string> = {
    "LinksList": "List of related links",
    "BuiltinSummarizing": "Built-in summarizing function",
    "CustomList": "Custom list rendering function",
    "CustomSummarizing": "Custom summarizing function"
}

export const OptionLabel: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "BuiltinSummarizing": "Built-in summarize function:",
    "CustomList": "Query's results' list's rendering function:",
    "CustomSummarizing": "Query's results' list's summarizing function:"
}


export const OptionSubLabel: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "BuiltinSummarizing": "",
    "CustomList": `function(page) { return <function using "page">; }`,
    "CustomSummarizing": `function(page) { return <function using "page">; }`
}

export const Helper: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "BuiltinSummarizing": "",
    "CustomList": "Javascript string, " +
        "the \"page\" (dataview page type) variable is available\n" +
        "example 1: page.file.name\nexample 2: `${page.file.name} of gender ${page.gender}`",
    "CustomSummarizing": "Javascript string, the \"pages\" (dataview pages type) " +
        "variable is available\nexample: " +
        "\nconst initialValue = 0;\nconst sumWithInitial = pages.reduce(\n" +
        "    (previousValue, currentValue) => previousValue + currentValue,\n" +
        "    initialValue\n);\nreturn `${sumWithInitial}`\n"
}

export const Default: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "BuiltinSummarizing": BuiltinSummarizing.Count,
    "CustomList": "page.file.name",
    "CustomSummarizing": "return pages.length"
}