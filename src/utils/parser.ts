export const fieldComponents = ['startStyle', 'attribute', 'endStyle', 'beforeSeparatorSpacer', 'afterSeparatorSpacer', 'values']

var genericFieldRegex = "(?<startStyle>[_\\*~`\\[\\(]*)(?<attribute>[0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)(?<endStyle>[_\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

var inlineFieldRegex = (attribute) => new RegExp(`(?<startStyle>[_*~\`\[\(]*)(?<attribute>${attribute})(?<endStyle>[_*~\`]*)(?<beforeSeparatorSpacer>\\s*)::(?<afterSeparatorSpacer>\\s*)(?<values>[^\]\)\r]+[\]\)]?)`, "u");
