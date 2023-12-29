import Managers from "src/fields/fieldManagers/Managers";

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
    "Input": "Accept any value",
    "Select": "Accept a single value from a list",
    "Multi": "Accept multiple values from a list",
    "Cycle": "Cycle through values from a list",
    "Boolean": "Accept true or false",
    "Number": "Accept a number",
    "File": "Accept a link",
    "MultiFile": "Accept multiple links",
    "Media": "Accept a link to a media file",
    "MultiMedia": "Accept multiple links to media files",
    "Date": "Accept a date",
    "Lookup": "Accept a lookup query",
    "Formula": "Accept a formula",
    "Canvas": "Updates with links in canvas",
    "CanvasGroup": "Updates with groups in canvas",
    "CanvasGroupLink": "Updates with links to groups in canvas",
    "YAML": "Accept a YAML object",
    "JSON": "Accept a JSON object",
    "Object": "Accept objects (values are fields)",
    "ObjectList": "Accept a list of object fields"
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