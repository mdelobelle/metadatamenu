import { App, TFile } from "obsidian";
import { fieldComponents, inlineFieldRegex } from "src/utils/parser";

export async function replaceValues(app: App, fileOrFilePath: TFile | string, attribute: string, input: string): Promise<void> {
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
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}`, "u");
            const fR = line.match(fullLineRegex);
            if (fR?.groups && Object.keys(fR.groups).every(j => fieldComponents.includes(j))) {
                const { inList, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = fR.groups
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                return `${inList || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}`;
            } else {
                const inSentenceRegex = new RegExp(`(?<=\\[)${inlineFieldRegex(attribute)}(?=\\])`, "gu");
                const sR = line.matchAll(inSentenceRegex);
                let next = sR.next();
                const newFields: { oldField: string, newField: string }[] = [];
                while (!next.done) {
                    const match = next.value;
                    if (match.groups && Object.keys(match.groups).every(j => fieldComponents.includes(j))) {
                        const { inList, startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = match.groups
                        const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                        const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                        newFields.push({
                            oldField: match[0],
                            newField: `${inList || ""}${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}`
                        })
                    }
                    next = sR.next()
                }
                newFields.forEach(field => {
                    const fieldRegex = new RegExp(field.oldField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "u")
                    line = line.replace(fieldRegex, field.newField);
                })
                return line;
            }
        }
    })
    app.vault.modify(file, newContent.join('\n'));
}