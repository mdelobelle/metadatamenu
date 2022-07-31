export const fieldComponents = ['startField', 'startStyle', 'attribute', 'endStyle', 'beforeSeparatorSpacer', 'afterSeparatorSpacer', 'values', 'endField', 'tail']

export const genericFieldRegex = "(?<startStyle>[\\*~`]*)(?<attribute>[-0-9_\\w\\p{L}\\p{Emoji_Presentation}\\s]+)(?<endStyle>[\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

export const inlineMultipleFieldRegex = "(?<startField>[\\[\\(]+)(?<startStyle>[\\*~`]*)(?<attribute>[-0-9_\\w\\p{L}\\p{Emoji_Presentation}\\s]+)(?<endStyle>[\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

export const inlineFieldRegex = (attribute: string) => new RegExp(`(?<startStyle>[\\*~\`\\[\\(]*)(?<attribute>${attribute})(?<endStyle>[\\*~\`]*)(?<beforeSeparatorSpacer>\\s*)::(?<afterSeparatorSpacer>\\s*)(?<values>[^\\]\\)\\n]+[\\]\\)]?)`, "u");