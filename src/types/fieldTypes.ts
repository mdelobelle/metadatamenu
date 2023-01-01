import Managers from "src/fields/fieldManagers/Managers";

export const enum FieldType {
    'Input' = "Input",
    'Select' = "Select",
    'Multi' = "Multi",
    'Cycle' = "Cycle",
    'Boolean' = "Boolean",
    "Number" = "Number",
    "File" = "File",
    "MultiFile" = "MultiFile",
    "Date" = "Date",
    "Lookup" = "Lookup",
    "Formula" = "Formula",
    "Canvas" = "Canvas",
    "CanvasGroup" = "CanvasGroup"
}

export const FieldTypeLabelMapping: Record<keyof typeof FieldType, FieldType> = {
    "Input": FieldType.Input,
    "Select": FieldType.Select,
    "Multi": FieldType.Multi,
    "Cycle": FieldType.Cycle,
    "Boolean": FieldType.Boolean,
    "Number": FieldType.Number,
    "File": FieldType.File,
    "MultiFile": FieldType.MultiFile,
    "Date": FieldType.Date,
    "Lookup": FieldType.Lookup,
    "Formula": FieldType.Formula,
    "Canvas": FieldType.Canvas,
    "CanvasGroup": FieldType.CanvasGroup
};

export const FieldTypeTagClass: Record<keyof typeof FieldType, string> = {
    "Input": "single",
    "Select": "select",
    "Multi": "multi",
    "Cycle": "cycle",
    "Boolean": "boolean",
    "Number": "number",
    "File": "file",
    "MultiFile": "file",
    "Date": "date",
    "Lookup": "lookup",
    "Formula": "formula",
    "Canvas": "canvas-links",
    "CanvasGroup": "canvas-links"
}

export const FieldTypeTooltip: Record<keyof typeof FieldType, string> = {
    "Input": "Accept any value",
    "Select": "Accept a single value from a list",
    "Multi": "Accept multiple values from a list",
    "Cycle": "Cycle through values from a list",
    "Boolean": "Accept true of false",
    "Number": "Accept a number",
    "File": "Accept a link",
    "MultiFile": "Accept multiple links",
    "Date": "Accept a date",
    "Lookup": "Accept a lookup query",
    "Formula": "Accept a formula",
    "Canvas": "Updates with links in canvas",
    "CanvasGroup": "Updates with groups in canvas"
}

export const FieldManager: Record<keyof typeof FieldType, any> = {
    "Input": Managers.Input,
    "Select": Managers.Select,
    "Multi": Managers.Multi,
    "Cycle": Managers.Cycle,
    "Boolean": Managers.Boolean,
    "Number": Managers.Number,
    "File": Managers.File,
    "MultiFile": Managers.MultiFile,
    "Date": Managers.Date,
    "Lookup": Managers.Lookup,
    "Formula": Managers.Formula,
    "Canvas": Managers.Canvas,
    "CanvasGroup": Managers.CanvasGroup,
}

export const FieldIcon: Record<keyof typeof FieldType, string> = {
    "Input": "pencil",
    "Select": "right-triangle",
    "Multi": "bullet-list",
    "Cycle": "switch",
    "Boolean": "checkmark",
    "Number": "plus-minus-glyph",
    "File": "link",
    "MultiFile": "link",
    "Date": "calendar-with-checkmark",
    "Lookup": "file-search",
    "Formula": "function-square",
    "Canvas": "layout-dashboard",
    "CanvasGroup": "box-select"
}

export const FieldBackgroundColorClass: Record<keyof typeof FieldType, string> = {
    "Input": "single",
    "Select": "select",
    "Multi": "multi",
    "Cycle": "cycle",
    "Boolean": "boolean",
    "Number": "number",
    "File": "file",
    "MultiFile": "file",
    "Date": "date",
    "Lookup": "lookup",
    "Formula": "lookup",
    "Canvas": "file",
    "CanvasGroup": "file"
}

export const multiTypes = [
    FieldType.Multi,
    FieldType.MultiFile,
    FieldType.Canvas,
    FieldType.CanvasGroup
]


export const ReservedMultiAttributes = ["tags", "tagNames", "excludes", "aliases"]