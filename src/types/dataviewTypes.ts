export type Link = {
    path: string,
    type: "file"
}

export enum FieldStyle {
    "Code" = "Code",
    "Italic" = "Italic",
    "Bold" = "Bold",
    "Strikethrough" = "Strikethrough"
}

export const FieldHTMLTagMap: Record<keyof typeof FieldStyle, keyof HTMLElementTagNameMap> = {
    "Code": "pre",
    "Italic": "i",
    "Bold": "b",
    "Strikethrough": "s"
}
export const FieldHTMLTag: Record<keyof typeof FieldStyle, [string, string]> = {
    "Code": ["<pre>", "<\pre>"],
    "Italic": ["<i>", "<\i>"],
    "Bold": ["<b>", "<\b>"],
    "Strikethrough": ["<s>", "<\s>"]
}

export const FieldStyleLabel: Record<string, keyof typeof FieldStyle> = {
    "code": "Code",
    "italic": "Italic",
    "bold": "Bold",
    "strikethrough": "Strikethrough"
}

export const FieldStyleKey: Record<keyof typeof FieldStyle, keyof typeof FieldStyleLabel> = {
    "Code": "code",
    "Italic": "italic",
    "Bold": "bold",
    "Strikethrough": "strikethrough"
}


export const FieldStyleSyntax: Record<keyof typeof FieldStyle, string> = {
    "Code": "`",
    "Italic": "*",
    "Bold": "**",
    "Strikethrough": "~~"
}

export const buildStartStyle = (style: Record<keyof typeof FieldStyleLabel, boolean>): string => {
    let startStyle = "";
    FieldStyleLabel.Italic
    if (style[FieldStyleKey.Italic]) startStyle += FieldStyleSyntax.Italic
    if (style[FieldStyleKey.Strikethrough]) startStyle += FieldStyleSyntax.Strikethrough
    if (style[FieldStyleKey.Bold]) startStyle += FieldStyleSyntax.Bold
    if (style[FieldStyleKey.Code]) startStyle += FieldStyleSyntax.Code
    return startStyle
}

export const buildEndStyle = (style: Record<keyof typeof FieldStyleLabel, boolean>): string => {
    let endStyle = "";
    if (style[FieldStyleKey.Code]) endStyle += FieldStyleSyntax.Code
    if (style[FieldStyleKey.Bold]) endStyle += FieldStyleSyntax.Bold
    if (style[FieldStyleKey.Strikethrough]) endStyle += FieldStyleSyntax.Strikethrough
    if (style[FieldStyleKey.Italic]) endStyle += FieldStyleSyntax.Italic
    return endStyle
}