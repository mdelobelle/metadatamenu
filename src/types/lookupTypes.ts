export enum BuiltinSummarizing {
    "Sum" = "Sum",
    "Count" = "Count",
    "CountAll" = "CountAll",
    "Average" = "Average",
    "Max" = "Max",
    "Min" = "Min"
}

export const BuiltinSummarizingFunctionDescription: Record<keyof typeof BuiltinSummarizing, string> = {
    "Sum": "Returns the sum of <{{summarizedFieldName}}> fields in the pages matching the query",
    "Count": "Counts all pages matching the query where <{{summarizedFieldName}}> is non empty",
    "CountAll": "Counts all pages matching the query (including empty fields)",
    "Average": "Returns the average value of <{{summarizedFieldName}}> fields in the pages matching the query",
    "Max": "Returns the maximum value of <{{summarizedFieldName}}> fields in the pages matching the query",
    "Min": "Returns the minimum value of <{{summarizedFieldName}}> fields in the pages matching the query",
}

export const BuiltinSummarizingFunction: Record<keyof typeof BuiltinSummarizing, string> = {
    "Sum": "const i=0;const sum = pages.reduce((p, c) => p + c[\"{{summarizedFieldName}}\"], i); return sum",
    "CountAll": "return pages.length",
    "Count": "return pages.filter(p => !!p[\"{{summarizedFieldName}}\"]).length",
    "Average": "const i=0.0;const sum = pages.reduce((p, c) => p + c[\"{{summarizedFieldName}}\"], i); return sum / pages.length",
    "Max": "return pages.reduce((p,c) => p[\"{{summarizedFieldName}}\"] >= c[\"{{summarizedFieldName}}\"] ? p : c)[\"{{summarizedFieldName}}\"]",
    "Min": "return pages.reduce((p,c) => p[\"{{summarizedFieldName}}\"]!==null && p[\"{{summarizedFieldName}}\"] <= c[\"{{summarizedFieldName}}\"] ? p : c)[\"{{summarizedFieldName}}\"]"
}

export enum Type {
    "LinksList" = "LinksList",
    "LinksBulletList" = "LinksBulletList",
    "BuiltinSummarizing" = "BuiltinSummarizing",
    "CustomList" = "CustomList",
    "CustomBulletList" = "CustomBulletList",
    "CustomSummarizing" = "CustomSummarizing"
}

export const ShortDescription: Record<keyof typeof Type, string> = {
    "LinksList": "Inline list of links",
    "LinksBulletList": "Bullet list of links",
    "BuiltinSummarizing": "",
    "CustomList": "Inline list of customized links",
    "CustomBulletList": "Bullet list of customized links",
    "CustomSummarizing": "Custom summarizing function"
}

export const MappingLabel: Record<keyof typeof Type, Type> = {
    "LinksList": Type.LinksList,
    "LinksBulletList": Type.LinksBulletList,
    "BuiltinSummarizing": Type.BuiltinSummarizing,
    "CustomList": Type.CustomList,
    "CustomBulletList": Type.CustomBulletList,
    "CustomSummarizing": Type.CustomSummarizing
}

export const Description: Record<keyof typeof Type, string> = {
    "LinksList": "List of related links displayed inline",
    "LinksBulletList": "List of related links displayed below the field",
    "BuiltinSummarizing": "Built-in summarizing function",
    "CustomList": "Custom list rendering function displayed inline",
    "CustomBulletList": "Custom list rendering function displayed below the field",
    "CustomSummarizing": "Custom summarizing function"
}

export const OptionLabel: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "LinksBulletList": "",
    "BuiltinSummarizing": "Built-in summarize function:",
    "CustomList": "Query's results' list's rendering function:",
    "CustomBulletList": "Query's results' list's rendering function:",
    "CustomSummarizing": "Query's results' list's summarizing function:"
}


export const OptionSubLabel: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "LinksBulletList": "",
    "BuiltinSummarizing": "",
    "CustomList": `function(page) { return <function using "page">; }`,
    "CustomBulletList": `function(page) { return <function using "page">; }`,
    "CustomSummarizing": `function(page) { return <function using "page">; }`
}

export const Helper: Record<keyof typeof Type, string> = {
    "LinksList": "",
    "LinksBulletList": "",
    "BuiltinSummarizing": "",
    "CustomList": "Javascript string, " +
        "the \"page\" (dataview page type) variable is available\n" +
        "example 1: page.file.name\nexample 2: `${page.file.name} of gender ${page.gender}`",
    "CustomBulletList": "Javascript string, " +
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
    "LinksBulletList": "",
    "BuiltinSummarizing": BuiltinSummarizing.Count,
    "CustomList": "page.file.name",
    "CustomBulletList": "page.file.name",
    "CustomSummarizing": "return pages.length"
}

export const bulletListLookupTypes = [
    Type.LinksBulletList,
    Type.CustomBulletList
]

export enum Status {
    "changed" = "changed",
    "error" = "error",
    "upToDate" = "upToDate"
}

export const statusIcon = {
    "error": "file-warning",
    "upToDate": "file-check",
    "changed": "refresh-ccw"
}