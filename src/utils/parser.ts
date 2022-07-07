export const genericFieldRegex = "[_\\*~`]*([0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)[_\\*~`]*\\s*";

export const inlineFieldRegex = (attribute: string) => new RegExp(`([_\*~\`]*)${attribute}([_\*~\`]*)(\\s*)::(.*)`, 'u');