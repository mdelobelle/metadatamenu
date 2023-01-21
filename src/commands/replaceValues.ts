import MetadataMenu from "main";
import { MarkdownView, TFile } from "obsidian";
import * as Lookup from "src/types/lookupTypes";
import { FieldType } from "src/types/fieldTypes";
import { getListBounds } from "src/utils/list";
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
            const { inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = match.groups
            const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
            const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
            const start = LocationWrapper[location].start;
            const end = LocationWrapper[location].end;
            newFields.push({
                oldField: match[0],
                newField: `${inQuote || ""}${start}${inList || ""}${preSpacer || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}${end}`,
            })
        }
        next = sR.next()
    }
    return newFields
}

export async function replaceValues(
    plugin: MetadataMenu,
    fileOrFilePath: TFile | string,
    attribute: string,
    input: string,
    previousItemsCount: number = 0
): Promise<void> {
    let file: TFile;
    if (fileOrFilePath instanceof TFile) {
        file = fileOrFilePath;
    } else {
        const _file = plugin.app.vault.getAbstractFileByPath(fileOrFilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const content = (await plugin.app.vault.read(file)).split('\n');
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    //first look for lookup lists

    const skippedLines: number[] = []

    const { position: { start, end } } = frontmatter ? frontmatter : { position: { start: undefined, end: undefined } };
    const newContent = content.map((line, i) => {
        if (start && end && i >= start.line && i <= end.line) {
            const regex = new RegExp(`^${attribute}:`, 'u');
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
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}(?<values>[^\\]]*)`, "u");
            const fR = encodedLine.match(fullLineRegex);
            if (fR?.groups && Object.keys(fR.groups).every(j => fieldComponents.includes(j))) {
                //check if this field is a lookup and get list boundaries
                const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === attribute)
                if (field?.type === FieldType.Lookup) {

                    //console.log(previousItemsCount)
                    const bounds = getListBounds(plugin, file, i)
                    if (bounds) {
                        const { start, end } = bounds;
                        for (let j = start + 1; j < start + previousItemsCount + 1 && j < end + 1; j++) {
                            skippedLines.push(j)
                        }
                    }
                }
                const { inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',').sort() : [];
                let newValue: string;
                let hiddenValue = "";

                if (field?.type === FieldType.Lookup && Lookup.bulletListLookupTypes.includes(field?.options.outputType as Lookup.Type)) {
                    newValue = inputArray.length == 1 ? "\n- " + inputArray[0] : `${inputArray.length > 0 ? "\n" : ""}${inputArray.map(item => "- " + item).join('\n')}`;
                    // hide the values next to the field so that they are readable by getValues. 
                    // we need getValues instead of dv.page to have the rawValue because dv is transforming data, making comparison impossible
                    hiddenValue = `<div hidden id="${field.name}_values">${input}</div>`
                } else {
                    newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                }
                return `${inQuote || ""}${inList || ""}${preSpacer || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${hiddenValue + newValue}`;
            } else {
                const newFields: FieldReplace[] = [];
                const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(attribute)}(?<values>[^\\]]+)?\\]`, "gu");
                const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(attribute)}(?<values>[^\\)]+)?\\)`, "gu");
                newFields.push(...matchInlineFields(inSentenceRegexBrackets, encodedLine, attribute, encodedInput, Location.brackets))
                newFields.push(...matchInlineFields(inSentenceRegexPar, encodedLine, attribute, encodedInput, Location.parenthesis))
                newFields.forEach(field => {
                    const fieldRegex = new RegExp(field.oldField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "u")
                    encodedLine = encodedLine.replace(fieldRegex, field.newField);
                })
                return decodeLink(encodedLine);
            }
        }
    });
    //console.log("started writing...", input)
    await plugin.app.vault.modify(file, newContent.filter((line, i) => !skippedLines.includes(i)).join('\n'));
    //console.log("finished writing...", input)
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
    if (editor) {
        const lineNumber = editor.getCursor().line
        editor.setCursor({ line: editor.getCursor().line, ch: editor.getLine(lineNumber).length })
    }
}