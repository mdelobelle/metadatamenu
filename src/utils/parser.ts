export const fieldComponents = ['inQuote', 'inList', 'preSpacer', 'startStyle', 'attribute', 'endStyle', 'beforeSeparatorSpacer', 'afterSeparatorSpacer', 'values']

export const genericFieldRegex = "(?<inQuote>\>*(\\s+)?)?(?<inList>- )?(?<preSpacer>(\\s+)?)?(?<startStyle>[_\\*~`]*)(?<attribute>[0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)(?<endStyle>[_\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

export const inlineFieldRegex = (attribute: string) => `(?<inQuote>\>*(\\s+)?)?(?<inList>- )?(?<preSpacer>(\\s+)?)?(?<startStyle>[_\\*~\`]*)(?<attribute>${attribute})(?<endStyle>[_\\*~\`]*)(?<beforeSeparatorSpacer>\\s*)::(?<afterSeparatorSpacer>\\s*)`;

export const fullLineRegex = new RegExp(`^\\s*${genericFieldRegex}::\\s*(?<values>.*)?`, "u");

export const inSentenceRegexBrackets = new RegExp(`\\[${genericFieldRegex}::\\s*(?<values>[^\\]]+)?\\]`, "gu");

export const inSentenceRegexPar = new RegExp(`\\(${genericFieldRegex}::\\s*(?<values>[^\\)]+)?\\)`, "gu");

export const encodeLink = (value: string): string => {
    /* replace link brackets by "impossible" combination of characters so that they won't be mixed up with inSentence field brackets when seaching with regex*/
    return value ? value
        .replace(/\[\[/g, "€ù")
        .replace(/\]\]/g, "ù€") : value
}

export const decodeLink = (value: string): string => {
    /* replace link brackets by "impossible" combination of characters so that they won't be mixed up with inSentence field brackets when seaching with regex*/
    return value ? value
        .replace(/€ù/gu, "[[")
        .replace(/ù€/gu, "]]") : value
}

export const frontMatterLineField = (line: string): string | undefined => {
    const frontMatterRegex = new RegExp(/(\s*)(?<attribute>[0-9\w\p{Letter}\p{Emoji_Presentation}][-0-9\w\p{Letter}\p{Emoji_Presentation}\s]*[^\s])(?<beforeSeparatorSpacer>\s*):(?<afterSeparatorSpacer>\s*)(?<values>.*)/u)
    const fR = line.match(frontMatterRegex);

    if (fR?.groups) {
        const { attribute } = fR?.groups
        return attribute
    }
}

export interface parsedField {
    attribute: string,
    values: string,
    index: number,
    length: number;
    inList: string,
    inQuote: string,
    preSpacer: string,
    startStyle: string,
    endStyle: string,
    beforeSeparatorSpacer: string,
    afterSeparatorSpacer: string,
    enclosureType?: "brackets" | "parenthesis"
}

export const getLineFields = (line: string): parsedField[] => {
    const fields: parsedField[] = []
    const fR = line.match(fullLineRegex);
    if (fR?.groups) {
        const { attribute, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
        fields.push({ attribute, values, index: 0, length: line.length, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer })
    } else {
        const sRBk = encodeLink(line).matchAll(inSentenceRegexBrackets);
        let next = sRBk.next();
        while (!next.done) {
            if (next.value.groups) {
                const { attribute, values, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer } = next.value.groups;
                fields.push({ attribute, values: decodeLink(values), index: next.value.index || 0, length: next.value[0].length, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, enclosureType: "brackets" });
            }
            next = sRBk.next();
        }
        const sRBc = encodeLink(line).matchAll(inSentenceRegexPar);
        next = sRBc.next();
        while (!next.done) {
            if (next.value.groups) {
                const { attribute, values, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer } = next.value.groups;
                fields.push({ attribute, values: decodeLink(values), index: next.value.index || 0, length: next.value[0].length, inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, enclosureType: "parenthesis" });
            }
            next = sRBc.next();
        }
    }
    fields.sort((a, b) => {
        if (a.index < b.index) return -1;
        if (a.index > b.index) return 1;
        return 0
    })
    return fields
}