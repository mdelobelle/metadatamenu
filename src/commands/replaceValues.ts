import { App, TFile } from "obsidian";
import { fieldComponents, inlineFieldRegex, encodeLink, decodeLink } from "src/utils/parser";

const enum Location {
    'fullLine' = 'fullLine',
    'brackets' = 'brackets',
    'parenthesis' = 'parenthesis'
}

const LocationWrapper: Record<keyof typeof Location, { start: "" | "[" | "(", end: "" | "]" | ")" }> = {
    "fullLine": { start: "", end: "" },
    "brackets": { start: "[", end: "]" },
    "parenthesis": { start: "(", end: ")" }
}

type FieldReplace = {
    oldField: string,
    newField: string,
}

export const matchInlineFields = (regex: RegExp, line: string, attribute: string, input: string, location: keyof typeof Location = "fullLine"): FieldReplace[] => {
    const sR = line.matchAll(regex);
    let next = sR.next();
    const newFields: FieldReplace[] = [];
    while (!next.done) {
        const match = next.value;
        if (match.groups && Object.keys(match.groups).every(j => fieldComponents.includes(j))) {
            const { inList, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = match.groups
            const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
            const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
            const start = LocationWrapper[location].start;
            const end = LocationWrapper[location].end;
            newFields.push({
                oldField: match[0],
                newField: `${start}${inList || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}${end}`,
            })
        }
        next = sR.next()
    }
    return newFields
}

export async function replaceValues(
    app: App,
    fileOrFilePath: TFile | string,
    attribute: string,
    input: string
): Promise<void> {
    let file: TFile;
    if (fileOrFilePath instanceof TFile) {
        file = fileOrFilePath;
    } else {
        const _file = app.vault.getAbstractFileByPath(fileOrFilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const content = (await app.vault.cachedRead(file)).split('\n');
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const { position: { start, end } } = frontmatter ? frontmatter : { position: { start: undefined, end: undefined } };
    const newContent = content.map((line, i) => {
        if (frontmatter && i >= start.line && i <= end.line) {
            const regex = new RegExp(`${attribute}:`, 'u');
            const r = line.match(regex);
            if (r && r.length > 0) {
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                const newValue = inputArray.length == 1 ? inputArray[0] : `[${inputArray.join(', ')}]`;
                return `${attribute}: ${newValue}`;
            } else {
                return line;
            }
        } else {
            const encodedInput = encodeLink(input)
            let encodedLine = encodeLink(line)
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}`, "u");
            const fR = encodedLine.match(fullLineRegex);
            if (fR?.groups && Object.keys(fR.groups).every(j => fieldComponents.includes(j))) {
                const { inList, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                return `${inList || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}`;
            } else {
                const newFields: FieldReplace[] = [];
                const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(attribute)}\\]`, "gu");
                const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(attribute)}\\)`, "gu");
                newFields.push(...matchInlineFields(inSentenceRegexBrackets, encodedLine, attribute, encodedInput, Location.brackets))
                newFields.push(...matchInlineFields(inSentenceRegexPar, encodedLine, attribute, encodedInput, Location.parenthesis))
                newFields.forEach(field => {
                    const fieldRegex = new RegExp(field.oldField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "u")
                    encodedLine = encodedLine.replace(fieldRegex, field.newField);
                })
                return decodeLink(encodedLine);
            }
        }
    })
    app.vault.modify(file, newContent.join('\n'));
}