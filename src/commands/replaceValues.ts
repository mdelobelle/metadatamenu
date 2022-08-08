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
            const regex = inlineFieldRegex(attribute);
            const r = line.match(regex);
            if (r?.groups && Object.keys(r.groups).every(i => fieldComponents.includes(i))) {
                const { startStyle, endStyle, beforeSeparatorSpacer, afterSeparatorSpacer, values } = r.groups
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                return `${startStyle}${attribute}${endStyle}${beforeSeparatorSpacer}::${afterSeparatorSpacer}${newValue}`;
            } else {
                return line;
            }
        }
    })
    app.vault.modify(file, newContent.join('\n'));
}