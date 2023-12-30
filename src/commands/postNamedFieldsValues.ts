import MetadataMenu from "main";
import { MarkdownView, TFile } from "obsidian";
import { FieldStyleLabel, buildEndStyle, buildStartStyle } from "src/types/dataviewTypes";
import { legacyGenuineKeys } from "src/utils/dataviewUtils";
import { decodeLink, encodeLink, fieldComponents, inlineFieldRegex } from "src/utils/parser";
import { FieldPayload } from "./postValues";
import { getFileFromFileOrPath, getFrontmatterPosition } from "src/utils/fileUtils";
import { Note } from "src/note/note";



export type NamedFieldsPayload = Array<{
    name: string,
    payload: FieldPayload
}>

type FieldReplace = {
    oldField: string,
    newField: string,
}

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

//create or update values starting at line or in frontmatter if no line
export async function postNamedFieldsValues(
    plugin: MetadataMenu,
    payload: NamedFieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
): Promise<void> {
    if (payload.some(_payload => !_payload.name)) {
        console.error("One payload's field is missing a name")
        return
    }
    const file = getFileFromFileOrPath(plugin, fileOrFilePath);
    const eFs = await Note.getExistingFields(plugin, file)
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontmatter = cache?.frontmatter
    const { start, end } = getFrontmatterPosition(plugin, file);
    const dvAPi = plugin.app.plugins.plugins.dataview?.api
    const inFrontmatter = !!(lineNumber === -1 || (lineNumber && start && end && lineNumber >= start.line && lineNumber <= end.line))
    const toCreateInline: Record<string, FieldPayload> = {};
    const toUpdateInline: Record<string, FieldPayload> = {};
    const toYaml: Record<string, FieldPayload> = {};
    payload.forEach(async item => {
        const create = !legacyGenuineKeys(dvAPi.page(file.path)).includes(item.name)
        if (create) {
            if (!lineNumber || inFrontmatter) {
                toYaml[item.name] = item.payload
            } else {
                toCreateInline[item.name] = item.payload
            }
        } else {
            if (frontmatter && Object.keys(frontmatter).includes(item.name)) {
                toYaml[item.name] = item.payload
            } else {
                toUpdateInline[item.name] = item.payload
            }
        }
    })
    //console.log(toYaml, toCreateInline, toUpdateInline)

    if (Object.keys(toYaml).length) {
        await plugin.app.fileManager.processFrontMatter(file, (fm) => {
            Object.keys(toYaml).forEach(key => {
                fm[key] = toYaml[key].value
            })
        })
    }
    if (Object.keys(toCreateInline).length || Object.keys(toUpdateInline).length) {
        postFieldsInline(plugin, file, toUpdateInline, toCreateInline, lineNumber, after, asList, asComment)
    }
}

export const matchInlineFields = (regex: RegExp, line: string, attribute: string, input: string, location: keyof typeof Location = "fullLine", style?: Record<keyof typeof FieldStyleLabel, boolean>): FieldReplace[] => {
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
            const targetStartStyle = style ? buildStartStyle(style) : startStyle
            const targetEndStyle = style ? buildEndStyle(style) : endStyle
            newFields.push({
                oldField: match[0],
                newField: `${inQuote || ""}${start}${inList || ""}${preSpacer || ""}${targetStartStyle}${attribute}${targetEndStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer || " "}${newValue}${end}`,
            })
        }
        next = sR.next()
    }
    return newFields
}

export async function postFieldsInline(
    plugin: MetadataMenu,
    file: TFile,
    fieldsToUpdate: Record<string, FieldPayload>,
    fieldsToCreate: Record<string, FieldPayload>,
    lineNumber?: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
) {
    //first look for lookup lists

    const skippedLines: number[] = []
    let newContent: string[] = []
    const currentContent = await plugin.app.vault.read(file)

    //first step: insert fields to Create
    currentContent.split("\n").forEach((line, _lineNumber) => {
        if (_lineNumber == lineNumber) {
            if (after) newContent.push(line);
            Object.entries(fieldsToCreate).forEach(([fieldName, payload]) => {
                const startStyle = payload.style ? buildStartStyle(payload.style) : ""
                const endStyle = payload.style ? buildEndStyle(payload.style) : ""
                const newLine = `${asComment ? ">" : ""}${asList ? "- " : ""}${startStyle}${fieldName}${endStyle}:: ${payload.value}`;
                newContent.push(newLine);
            })
            if (!after) newContent.push(line);
        } else {
            newContent.push(line);
        }
    });

    const updateContentWithField = (content: string[], fieldName: string, payload: FieldPayload): string[] => {
        return content.map((line, i) => {
            const encodedInput = encodeLink(payload.value)
            let encodedLine = encodeLink(line)
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(fieldName)}(?<values>[^\\]]*)`, "u");
            const fR = encodedLine.match(fullLineRegex);
            if (fR?.groups && Object.keys(fR.groups).every(j => fieldComponents.includes(j))) {
                const { inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
                const targetStartStyle = payload.style ? buildStartStyle(payload.style) : startStyle
                const targetEndStyle = payload.style ? buildEndStyle(payload.style) : endStyle
                const inputArray = payload.value ? payload.value.replace(/(\,\s+)/g, ',').split(',').sort() : [];
                let newValue: string;
                let hiddenValue = "";
                let emptyLineAfterList = "";
                newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                return `${inQuote || ""}${inList || ""}${preSpacer || ""}${targetStartStyle}${fieldName}${targetEndStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer || " "}${hiddenValue + newValue + emptyLineAfterList}`;
            } else {
                const newFields: FieldReplace[] = [];
                const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(fieldName)}(?<values>[^\\]]+)?\\]`, "gu");
                const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(fieldName)}(?<values>[^\\)]+)?\\)`, "gu");
                newFields.push(...matchInlineFields(inSentenceRegexBrackets, encodedLine, fieldName, encodedInput, Location.brackets, payload.style))
                newFields.push(...matchInlineFields(inSentenceRegexPar, encodedLine, fieldName, encodedInput, Location.parenthesis, payload.style))
                newFields.forEach(field => {
                    const fieldRegex = new RegExp(field.oldField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "u")
                    encodedLine = encodedLine.replace(fieldRegex, field.newField);
                })
                return decodeLink(encodedLine);
            }
        })
    }

    //iterate over each field to update them in the new content
    Object.entries(fieldsToUpdate).forEach(([fieldName, payload]) => {
        newContent = updateContentWithField(newContent, fieldName, payload)
    })

    //console.log("started writing...", input)
    const updatedFile = newContent.filter((line, i) => !skippedLines.includes(i)).join('\n')
    await plugin.app.vault.modify(file, updatedFile);
    //console.log("finished writing...", input)
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
    if (editor) {
        const lineNumber = editor.getCursor().line
        editor.setCursor({ line: editor.getCursor().line, ch: editor.getLine(lineNumber).length })
    }
}