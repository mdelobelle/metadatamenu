import Managers from "src/fields/Managers";

export enum FieldType {
    'Input' = "Input",
    'Select' = "Select",
    'Multi' = "Multi",
    'Cycle' = "Cycle",
    'Boolean' = "Boolean",
    "Number" = "Number",
    "File" = "File",
    "MultiFile" = "MultiFile",
    "Media" = "Media",
    "MultiMedia" = "MultiMedia",
    "Date" = "Date",
    "DateTime" = "DateTime",
    "Time" = "Time",
    "Lookup" = "Lookup",
    "Formula" = "Formula",
    "Canvas" = "Canvas",
    "CanvasGroup" = "CanvasGroup",
    "CanvasGroupLink" = "CanvasGroupLink",
    "YAML" = "YAML",
    "JSON" = "JSON",
    "Object" = "Object",
    "ObjectList" = "ObjectList"
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
    "Media": FieldType.Media,
    "MultiMedia": FieldType.MultiMedia,
    "Date": FieldType.Date,
    "DateTime": FieldType.DateTime,
    "Time": FieldType.Time,
    "Lookup": FieldType.Lookup,
    "Formula": FieldType.Formula,
    "Canvas": FieldType.Canvas,
    "CanvasGroup": FieldType.CanvasGroup,
    "CanvasGroupLink": FieldType.CanvasGroupLink,
    "YAML": FieldType.YAML,
    "JSON": FieldType.JSON,
    "Object": FieldType.Object,
    "ObjectList": FieldType.ObjectList
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
    "Media": "file",
    "MultiMedia": "file",
    "Date": "date",
    "DateTime": "datetime",
    "Time": "time",
    "Lookup": "lookup",
    "Formula": "formula",
    "Canvas": "canvas-links",
    "CanvasGroup": "canvas-links",
    "CanvasGroupLink": "canvas-links",
    "YAML": "yaml",
    "JSON": "json",
    "Object": "object",
    "ObjectList": "object-list"
}

export const FieldTypeTooltip: Record<keyof typeof FieldType, string> = {
    "Input": "Accepts any value",
    "Select": "Accepts a single value from a list",
    "Multi": "Accepts multiple values from a list",
    "Cycle": "Cycles through values from a list",
    "Boolean": "Accepts true or false",
    "Number": "Accepts a number",
    "File": "Accepts a link",
    "MultiFile": "Accepts multiple links",
    "Media": "Accepts a link to a media file",
    "MultiMedia": "Accepts multiple links to media files",
    "Date": "Accepts a date",
    "DateTime": "Accepts a date with time",
    "Time": "Accepts a time",
    "Lookup": "Accepts a lookup query",
    "Formula": "Accepts a formula",
    "Canvas": "Updates with links in canvas",
    "CanvasGroup": "Updates with groups in canvas",
    "CanvasGroupLink": "Updates with links to groups in canvas",
    "YAML": "Accepts a YAML object",
    "JSON": "Accepts a JSON object",
    "Object": "Accepts objects (values are fields)",
    "ObjectList": "Accepts a list of object fields"
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
    "Media": Managers.Media,
    "MultiMedia": Managers.MultiMedia,
    "Date": Managers.Date,
    "DateTime": Managers.DateTime,
    "Time": Managers.Time,
    "Lookup": Managers.Lookup,
    "Formula": Managers.Formula,
    "Canvas": Managers.Canvas,
    "CanvasGroup": Managers.CanvasGroup,
    "CanvasGroupLink": Managers.CanvasGroupLink,
    "YAML": Managers.YAML,
    "JSON": Managers.JSON,
    "Object": Managers.Object,
    "ObjectList": Managers.ObjectList
}

export const FieldIcon: Record<keyof typeof FieldType, string> = {
    "Input": "pencil",
    "Select": "right-triangle",
    "Multi": "bullet-list",
    "Cycle": "switch",
    "Boolean": "toggle-left",
    "Number": "plus-minus-glyph",
    "File": "link",
    "MultiFile": "link",
    "Media": "paperclip",
    "MultiMedia": "paperclip",
    "Date": "calendar-with-checkmark",
    "DateTime": "calendar-clock",
    "Time": "clock-4",
    "Lookup": "file-search",
    "Formula": "function-square",
    "Canvas": "layout-dashboard",
    "CanvasGroup": "box-select",
    "CanvasGroupLink": "box-select",
    "YAML": "file-json-2",
    "JSON": "file-json-2",
    "Object": "package",
    "ObjectList": "boxes"
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
    "Media": "file",
    "MultiMedia": "file",
    "Date": "date",
    "DateTime": "date",
    "Time": "time",
    "Lookup": "lookup",
    "Formula": "lookup",
    "Canvas": "file",
    "CanvasGroup": "file",
    "CanvasGroupLink": "file",
    "YAML": "file",
    "JSON": "file",
    "Object": "lookup",
    "ObjectList": "lookup"
}

export const multiTypes = [
    FieldType.Multi,
    FieldType.MultiFile,
    FieldType.Canvas,
    FieldType.CanvasGroup,
    FieldType.CanvasGroupLink,
    FieldType.ObjectList
]


export const ReservedMultiAttributes = ["tags", "tagNames", "excludes", "aliases"]

export enum MultiDisplayType {
    "asArray" = 'asArray', //YAML flow style
    "asList" = "asList" //YAML block style
}

export const rawObjectTypes = [
    FieldType.YAML,
    FieldType.JSON
]

export const objectTypes = [
    FieldType.Object,
    FieldType.ObjectList
]

export const rootOnlyTypes = [
    FieldType.Canvas,
    FieldType.CanvasGroup,
    FieldType.CanvasGroupLink,
    FieldType.Lookup,
    FieldType.Formula
]

export const frontmatterOnlyTypes = [
    FieldType.YAML,
    FieldType.Object,
    FieldType.ObjectList
]

export enum MediaType {
    "Audio" = "Audio",
    "Image" = "Image",
    "Video" = "Video"
}

export const extensionMediaTypes: Record<string, MediaType> = {
    'avif': MediaType.Image,
    'bmp': MediaType.Image,
    'gif': MediaType.Image,
    'jpg': MediaType.Image,
    'jpeg': MediaType.Image,
    'png': MediaType.Image,
    'svg': MediaType.Image,
    'tif': MediaType.Image,
    'tiff': MediaType.Image,
    'webp': MediaType.Image,
}