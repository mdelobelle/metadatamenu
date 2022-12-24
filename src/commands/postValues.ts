import MetadataMenu from "main";
import { FrontMatterCache, MarkdownView, parseYaml, TFile } from "obsidian";
import { FieldType, multiTypes } from "src/types/fieldTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { getListBounds } from "src/utils/list";
import * as Lookup from "src/types/lookupTypes";
import { fieldComponents, inlineFieldRegex, encodeLink, decodeLink } from "src/utils/parser";
import { genuineKeys } from "src/utils/dataviewUtils";


/*=========================
metadataSuggester à simplifier
==========================*/


export type FieldPayload = {
    value: string,
    previousItemsCount?: number,
    addToCurrentValues?: boolean
}

export type FieldsPayload = Array<{
    name: string,
    payload: FieldPayload
}>

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

export function renderField(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    rawValue: string,
    location: "yaml" | "inline"
): any {
    const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)
    const parseFieldValue = (_rawValue: string) => {
        if (_rawValue.startsWith("[[")) {
            return `${_rawValue}`
        } else if (_rawValue.startsWith("#")) {
            return `${_rawValue}`;
        } else {
            return parseYaml(_rawValue);
        };
    }
    const renderMultiFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
        const values = rawValue
            .replace(/(\,\s+)/g, ',')
            .split(',')
            .filter(v => !!v)
            .map(value => itemRendering(value));
        return values.length ? values : null
    }
    switch (location) {
        case "yaml":
            switch (field?.type) {
                case FieldType.Lookup: return renderMultiFields(rawValue, (item) => parseFieldValue(item))
                case FieldType.Multi: return renderMultiFields(rawValue, (item) => parseFieldValue(item))
                case FieldType.MultiFile: return renderMultiFields(rawValue, (item) => `${item}`)
                default: return parseFieldValue(rawValue);
            }
        case "inline":
            return rawValue;
    }

}

export const matchInlineFields = (regex: RegExp, line: string, attribute: string, input: string, location: keyof typeof Location = "fullLine"): FieldReplace[] => {
    const sR = line.matchAll(regex);
    let next = sR.next();
    const newFields: FieldReplace[] = [];
    while (!next.done) {
        const match = next.value;
        if (match.groups && Object.keys(match.groups).every(j => fieldComponents.includes(j))) {
            const { inList, inQuote, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = match.groups
            const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
            const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
            const start = LocationWrapper[location].start;
            const end = LocationWrapper[location].end;
            newFields.push({
                oldField: match[0],
                newField: `${inQuote || ""}${start}${inList || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}${end}`,
            })
        }
        next = sR.next()
    }
    return newFields
}

export async function postFieldInYaml(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    fieldValue: any
) {
    await plugin.app.fileManager.processFrontMatter(file, fm => fm[fieldName] = renderField(plugin, file, fieldName, fieldValue, "yaml"))
}

export async function createFieldInline(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    fieldValue: any,
    lineNumber: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
) {
    const result = await plugin.app.vault.read(file)
    let newContent: string[] = [];
    result.split("\n").forEach((line, _lineNumber) => {
        if (_lineNumber == lineNumber) {
            if (after) newContent.push(line);
            const newLine = `${asComment ? ">" : ""}${asList ? "- " : ""}${fieldName}:: ${fieldValue}`;
            newContent.push(newLine);
            if (!after) newContent.push(line);
        } else {
            newContent.push(line);
        }
    });

    await plugin.app.vault.modify(file, newContent.join('\n'));
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
    if (editor) {
        const lineNumber = editor.getCursor().line
        editor.setCursor({ line: editor.getCursor().line, ch: editor.getLine(lineNumber).length })
    }
}

export async function updateFieldInline(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    fieldValue: string,
    previousItemsCount: number = 0,
) {
    const content = (await plugin.app.vault.cachedRead(file)).split('\n');
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    //first look for lookup lists

    const skippedLines: number[] = []
    const newContent = content.map((line, i) => {
        const encodedInput = encodeLink(fieldValue)
        let encodedLine = encodeLink(line)
        const fullLineRegex = new RegExp(`^${inlineFieldRegex(fieldName)}(?<values>[^\\]]*)`, "u");
        const fR = encodedLine.match(fullLineRegex);
        if (fR?.groups && Object.keys(fR.groups).every(j => fieldComponents.includes(j))) {
            //check if this field is a lookup and get list boundaries
            const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)
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
            const { inList, inQuote, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
            const inputArray = fieldValue ? fieldValue.replace(/(\,\s+)/g, ',').split(',').sort() : [];
            let newValue: string;
            let hiddenValue = "";

            if (field?.type === FieldType.Lookup && Lookup.bulletListLookupTypes.includes(field?.options.outputType as Lookup.Type)) {
                newValue = inputArray.length === 1 ? "\n- " + inputArray[0] : `${inputArray.length > 0 ? "\n" : ""}${inputArray.map(item => "- " + item).join('\n')}`;
                // hide the values next to the field so that they are readable by getValues. 
                // we need getValues instead of dv.page to have the rawValue because dv is transforming data, making comparison impossible
                hiddenValue = `<div hidden id="${field.name}_values">${fieldValue}</div>`
            } else {
                newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
            }
            return `${inQuote || ""}${inList || ""}${startStyle}${fieldName}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${hiddenValue + newValue}`;
        } else {
            const newFields: FieldReplace[] = [];
            const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(fieldName)}(?<values>[^\\]]+)?\\]`, "gu");
            const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(fieldName)}(?<values>[^\\)]+)?\\)`, "gu");
            newFields.push(...matchInlineFields(inSentenceRegexBrackets, encodedLine, fieldName, encodedInput, Location.brackets))
            newFields.push(...matchInlineFields(inSentenceRegexPar, encodedLine, fieldName, encodedInput, Location.parenthesis))
            newFields.forEach(field => {
                const fieldRegex = new RegExp(field.oldField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "u")
                encodedLine = encodedLine.replace(fieldRegex, field.newField);
            })
            return decodeLink(encodedLine);
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

export async function postField(
    create: boolean,
    frontmatter: FrontMatterCache | undefined,
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    fieldPayload: FieldPayload,
    inFrontmatter: boolean = false,
    lineNumber?: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
) {
    if (create) {
        if (!lineNumber || inFrontmatter) {
            await postFieldInYaml(plugin, file, fieldName, fieldPayload.value);
        } else {
            await createFieldInline(plugin, file, fieldName, fieldPayload.value, lineNumber, after, asList, asComment);
        }
    } else {
        const dvApi = plugin.app.plugins.plugins.dataview?.api;
        const currentValue = dvApi && dvApi.page(file.path)?.[fieldName]
        const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)
        const multi = field && multiTypes.includes(field.type)
        const newValue = currentValue && fieldPayload.addToCurrentValues && multi ? `${currentValue}, ${fieldPayload.value}` : fieldPayload.value
        if (frontmatter && Object.keys(frontmatter).includes(fieldName)) {
            await postFieldInYaml(plugin, file, fieldName, newValue);
        } else {
            await updateFieldInline(plugin, file, fieldName, newValue, fieldPayload.previousItemsCount)
        }
    }
}

//create or update values starting at line or in frontmatter if no line
export async function postValues(
    plugin: MetadataMenu,
    payload: FieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
): Promise<void> {
    const file = getFileFromFileOrPath(plugin, fileOrFilePath);
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter
    const { position: { start, end } } = frontmatter ? frontmatter : { position: { start: undefined, end: undefined } };
    const dvAPi = plugin.app.plugins.plugins.dataview?.api
    const inFrontmatter = !!(lineNumber === -1 || (lineNumber && start && end && lineNumber >= start.line && lineNumber <= end.line))

    payload.forEach(async field => {
        const create = !genuineKeys(dvAPi.page(file.path)).includes(field.name)
        await plugin.fileTaskManager
            .pushTask(() => { postField(create, frontmatter, plugin, file, field.name, field.payload, inFrontmatter, lineNumber, after, asList, asComment) });
    })
}