export const genericFieldRegex = "[_\\*~`]*(?<attribute>[0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)[_\\*~`]*\\s*";

export const inlineFieldRegex = (attribute: string) => new RegExp(`(?<attribute>[_\*~\`]*)${attribute}([_\*~\`]*)(\\s*)::(?<values>.*)`, 'u');