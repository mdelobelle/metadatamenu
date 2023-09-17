import MetadataMenu from "main";
import { MarkdownView, parseYaml, TFile } from "obsidian";
import { FieldType, MultiDisplayType, multiTypes, objectTypes } from "src/types/fieldTypes";
import { FieldStyleLabel, buildEndStyle, buildStartStyle } from "src/types/dataviewTypes";
import { getFileFromFileOrPath, getFrontmatterPosition } from "src/utils/fileUtils";
import { getListBounds } from "src/utils/list";
import * as Lookup from "src/types/lookupTypes";
import { fieldComponents, inlineFieldRegex, encodeLink, decodeLink } from "src/utils/parser";
import { genuineKeys } from "src/utils/dataviewUtils";
import { ReservedMultiAttributes } from "src/types/fieldTypes";
import Field from "src/fields/Field";
import { Note } from "src/note/note";


export type FieldPayload = {
    value: string,
    previousItemsCount?: number,
    addToCurrentValues?: boolean,
    style?: Record<keyof typeof FieldStyleLabel, boolean>
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
        if (_rawValue) {
            if (_rawValue.startsWith("[[")) {
                return `"${_rawValue}"`
            } else if (_rawValue.startsWith("#")) {
                return `${_rawValue}`;
            } else if (field?.type && objectTypes.includes(field?.type)) {
                return `\n  ${_rawValue.split("\n").join("\n  ")}`;
            } else {
                return parseYaml(_rawValue);
            };
        } else {
            return ""
        }
    }
    const renderMultiFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
        const values = rawValue
            .replace(/(\,\s+)/g, ',')
            .split(',')
            .filter(v => !!v)
            .map(value => itemRendering(value));
        return values.length ? values : ""
    }
    switch (location) {
        case "yaml":
            switch (field?.type) {
                case FieldType.Lookup: return renderMultiFields(rawValue, (item) => parseFieldValue(item));
                case FieldType.Multi: return renderMultiFields(rawValue, (item) => parseFieldValue(item));
                case FieldType.MultiFile: return renderMultiFields(rawValue, (item) => `"${item}"`);
                case FieldType.Canvas: return renderMultiFields(rawValue, (item) => item ? `${item}` : "");
                case undefined: if ([...ReservedMultiAttributes, plugin.settings.fileClassAlias].includes(fieldName)) {
                    return renderMultiFields(rawValue, (item) => `${item}`)
                } else {
                    return parseFieldValue(rawValue);
                };
                default: return parseFieldValue(rawValue);
            }
        case "inline":
            switch (field?.type) {
                case FieldType.JSON: return JSON.stringify(JSON.parse(rawValue))
                case FieldType.YAML: return rawValue; break;
                default: return rawValue;
            }
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

export async function postFieldsInYaml(
    plugin: MetadataMenu,
    file: TFile,
    fields: Record<string, FieldPayload>
) {
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontmatter = cache?.frontmatter
    const newContent = []
    const currentFile = await app.vault.read(file)
    const skippedLines: number[] = []
    //tests
    const note = new Note(plugin, file)

    const indentAncestor = (field: Field, ancestor: string, level: number) => {
        const ancestorName = Field.getFieldFromId(plugin, ancestor, field.fileClassName)?.name || "unknown";
        return `${"  ".repeat(level)}${ancestorName}:`
    }
    const nestFieldName = (field: Field) => {
        const ancestors = field.getAncestors(plugin);
        const level = ancestors.length
        return `${ancestors.map((ancestor, i) => indentAncestor(field, ancestor, i)).join("\n")}${level === 0 ? "" : "\n"}${"  ".repeat(level)}${field.name}`
    }
    const nestItem = (field: Field, value: any) => {
        const ancestors = field.getAncestors(plugin);
        const level = ancestors.length
        return `${"  ".repeat(level + 1)}- ${value}`
    }
    const pushNewField = (fieldName: string, payload: FieldPayload): void => {
        const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName);
        if (field) {
            const newValue = renderField(plugin, file, fieldName, payload.value, "yaml")

            if (Array.isArray(newValue)) {
                if (field?.getDisplay(plugin) === MultiDisplayType.asList) {
                    newContent.push(`${nestFieldName(field)}:`)
                    newValue.filter(v => !!v).forEach(item => {
                        newContent.push(nestItem(field, item))
                    });
                } else {
                    newContent.push(`${nestFieldName(field)}: [${newValue.join(", ")}]`);
                }
            } else {
                newContent.push(`${nestFieldName(field)}: ${newValue}`);
            }
        } else {
            newContent.push(`${fieldName}: ${payload.value}`);
        }
    }
    if (!frontmatter) {
        newContent.push("---");
        Object.entries(fields).forEach(([fieldName, payload]) => pushNewField(fieldName, payload));
        newContent.push("---")
        newContent.push(...currentFile.split("\n"))
    } else {
        const currentContent = currentFile.split("\n")
        currentContent.forEach((line, lineNumber) => {
            if (lineNumber > getFrontmatterPosition(plugin, file).end!.line) {
                // don't touch outside frontmatter : it's handled by postFieldsInline
                newContent.push(line)
            } else if (lineNumber === getFrontmatterPosition(plugin, file).end!.line) {
                //insert here the new fields    
                Object.entries(fields)
                    .filter(([fieldName, payload]) => !Object.keys(frontmatter).includes(fieldName))
                    .forEach(([fieldName, payload]) => {
                        pushNewField(fieldName, payload)
                    })
                newContent.push(line)
            } else if (!skippedLines.includes(lineNumber)) {
                //check if any of fields is matching this line and skip lines undeneath modified multi fields: they are reconstructed
                const matchedField: { name: string | undefined, payload: FieldPayload | undefined } = { name: undefined, payload: undefined }
                /* 
                ici on doit changer la détection du field, ça devient plus compliqué
                premiere difficulté: 
                on doit chercher récursivement le premier ancetre puis le suivant etc, jusqu'à ce qu'on arrive au près et là on peut skip les lignes
                deuxième difficulté: si un des ancêtre n'existe pas encore dans l'arborescence il faut le créer
                peut-être changer totalement la manière dont on explore le document
                par exemple faire une liste de nodes {line number, field, level, value} pour l'ensemble des fields de la fileclass ou des preseetFields
                avantage: on peut reconstruire un document en insérant des lignes, changeant le level des nodes, leur value facilement

                commençons par ça
                */
                Object.entries(fields).forEach(([fieldName, payload]) => {
                    const regex = new RegExp(`^${fieldName}:`, 'u');
                    const r = line.match(regex);
                    if (r && r.length > 0) {
                        //search for indented value "below" and skip them
                        let j = 1;

                        //while (currentContent[lineNumber + j].startsWith("  - ")) {
                        while (currentContent[lineNumber + j].startsWith("  ")) {
                            skippedLines.push(lineNumber + j);
                            j = j + 1
                        }
                        //we have a match
                        matchedField.name = fieldName
                        matchedField.payload = payload
                    }
                })
                if (matchedField.name && matchedField.payload) {
                    pushNewField(matchedField.name, matchedField.payload)
                } else {
                    newContent.push(line)
                }
            }
        })
    }
    const updatedFile = newContent.join('\n')

    // ---- don't modify the note to check modification in the note object solely -----
    //await plugin.app.vault.modify(file, updatedFile);
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
                const newValue = renderField(plugin, file, fieldName, payload.value, "inline")
                const startStyle = payload.style ? buildStartStyle(payload.style) : ""
                const endStyle = payload.style ? buildEndStyle(payload.style) : ""
                const newLine = `${asComment ? ">" : ""}${asList ? "- " : ""}${startStyle}${fieldName}${endStyle}:: ${newValue}`;
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
                //check if this field is a lookup and get list boundaries
                const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === fieldName)
                if (field?.type === FieldType.Lookup) {
                    const bounds = getListBounds(plugin, file, i)
                    if (bounds) {
                        const { start, end } = bounds;
                        for (let j = start + 1; j < start + (payload.previousItemsCount || 0) + 1 && j < end + 1; j++) {
                            skippedLines.push(j)
                        }
                    }
                }
                const { inList, inQuote, preSpacer, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
                const targetStartStyle = payload.style ? buildStartStyle(payload.style) : startStyle
                const targetEndStyle = payload.style ? buildEndStyle(payload.style) : endStyle
                let inputArray: any[] = []
                switch (field?.type) {
                    case FieldType.JSON: inputArray = [JSON.stringify(JSON.parse(payload.value))]; break;
                    case FieldType.YAML: inputArray = ["\"" + payload.value.split("\n").join("\\n") + "\""]; break;
                    default: inputArray = payload.value ? payload.value.replace(/(\,\s+)/g, ',').split(',').sort() : [];
                }
                let newValue: string;
                let hiddenValue = "";
                let emptyLineAfterList = "";
                if (field?.type === FieldType.Lookup && Lookup.bulletListLookupTypes.includes(field?.options.outputType as Lookup.Type)) {
                    //console.log(`next line [${content[i + (payload.previousItemsCount || 0) + 1]}]`)
                    emptyLineAfterList = content[i + (payload.previousItemsCount || 0) + 1] !== "" ? "\n" : ""
                    newValue = inputArray.length === 1 ? "\n- " + inputArray[0] : `${inputArray.length > 0 ? "\n" : ""}${inputArray.map(item => "- " + item).join('\n')}`;
                    // hide the values next to the field so that they are readable by getValues. 
                    // we need getValues instead of dv.page to have the rawValue because dv is transforming data, making comparison impossible
                    hiddenValue = `<div hidden id="${field.name}_values">${payload.value}</div>`
                } else {
                    newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                }
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
    //don't modify the note to check modificiation in note solely
    //await plugin.app.vault.modify(file, updatedFile);

    //console.log("finished writing...", input)
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
    if (editor) {
        const lineNumber = editor.getCursor().line
        editor.setCursor({ line: editor.getCursor().line, ch: editor.getLine(lineNumber).length })
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
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontmatter = cache?.frontmatter
    const { start, end } = getFrontmatterPosition(plugin, file);
    const dvAPi = plugin.app.plugins.plugins.dataview?.api
    const inFrontmatter = !!(lineNumber === -1 || (lineNumber && start && end && lineNumber >= start.line && lineNumber <= end.line))
    const toCreateInline: Record<string, FieldPayload> = {};
    const toUpdateInline: Record<string, FieldPayload> = {};
    const toYaml: Record<string, FieldPayload> = {};
    payload.forEach(async item => {
        const create = !genuineKeys(dvAPi.page(file.path)).includes(item.name)
        if (create) {
            if (!lineNumber || inFrontmatter) {
                toYaml[item.name] = item.payload
            } else {
                const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === item.name)
                const itemPayload = item.payload
                if (field?.style) {
                    itemPayload.style = field.style
                }
                toCreateInline[item.name] = itemPayload
            }
        } else {
            const dvApi = plugin.app.plugins.plugins.dataview?.api;
            const currentValue = dvApi && dvApi.page(file.path)?.[item.name]
            const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.name === item.name)
            const multi = field && multiTypes.includes(field.type)
            const newValue = currentValue
                && item.payload.addToCurrentValues
                && (multi || ReservedMultiAttributes.includes(item.name)) ?
                `${currentValue}, ${item.payload.value}` :
                item.payload.value
            item.payload.value = newValue
            if (frontmatter && Object.keys(frontmatter).includes(item.name)) {
                toYaml[item.name] = item.payload
            } else {
                const itemPayload = item.payload
                if (field?.style) {
                    itemPayload.style = field.style
                }
                toUpdateInline[item.name] = item.payload
            }
        }
    })
    //console.log(toYaml, toCreateInline, toUpdateInline)
    /*
    if (Object.keys(toYaml).length) await plugin.fileTaskManager
        .pushTask(() => { postFieldsInYaml(plugin, file, toYaml) })
    if (Object.keys(toCreateInline).length || Object.keys(toUpdateInline).length) await plugin.fileTaskManager
        .pushTask(() => { postFieldsInline(plugin, file, toUpdateInline, toCreateInline, lineNumber, after, asList, asComment) })
    */
    const note = new Note(plugin, file)
    await note.buildLines()
    console.log(note.renderNote())
    note.createOrUpdateFields(payload, lineNumber)
    console.log(note.renderNote())

}