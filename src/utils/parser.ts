export const fieldComponents = ['inList', 'startStyle', 'attribute', 'endStyle', 'beforeSeparatorSpacer', 'afterSeparatorSpacer', 'values']

export const genericFieldRegex = "(?<inList>- )?(?<startStyle>[_\\*~`]*)(?<attribute>[0-9\\w\\p{Letter}\\p{Emoji_Presentation}][-0-9\\w\\p{Letter}\\p{Emoji_Presentation}\\s]*)(?<endStyle>[_\\*~`]*)(?<beforeSeparatorSpacer>\\s*)";

export const inlineFieldRegex = (attribute: string) => `(?<inList>- )?(?<startStyle>[_\\*~\`]*)(?<attribute>${attribute})(?<endStyle>[_\\*~\`]*)(?<beforeSeparatorSpacer>\\s*)::(?<afterSeparatorSpacer>\\s*)(?<values>[^\\]]+)`;

export const fullLineRegex = new RegExp(`^${genericFieldRegex}::\s*(?<values>.+)?`, "u");

export const inSentenceRegex = new RegExp(`((?<=\\[)${genericFieldRegex}::\s*(?<values>[^\\]]+)?(?=\\]))`, "gu");

export const getLineFields = (line: string): { attribute: string, values: string }[] => {
    const fields: { attribute: string, values: string }[] = []
    const fR = line.match(fullLineRegex);
    if (fR?.groups) {
        const { attribute, values } = fR?.groups
        fields.push({ attribute, values })
    } else {
        const sR = line.matchAll(inSentenceRegex);
        let next = sR.next();
        while (!next.done) {
            if (next.value.groups) {
                const { attribute, values } = next.value.groups;
                fields.push({ attribute, values });
            }
            next = sR.next();
        }
    }
    return fields
}   