import MetadataMenu from "main";
import { TFile } from "obsidian"
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { inlineFieldRegex, encodeLink, decodeLink } from "src/utils/parser";

//TODO rewrite with note.build & existingFields
export async function getValues(plugin: MetadataMenu, fileOrfilePath: TFile | string, attribute: string): Promise<string[]> {
    let file: TFile;
    if (fileOrfilePath instanceof TFile) {
        file = fileOrfilePath;
    } else {
        const _file = plugin.app.vault.getAbstractFileByPath(fileOrfilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const content = (await plugin.app.vault.read(file)).split('\n');
    const { start, end } = getFrontmatterPosition(plugin, file);
    const result: string[] = [];
    content.map((line, i) => {
        if (start && end && i >= start.line && i <= end.line) {
            const regex = new RegExp(`${attribute}:(.*)`, 'u');
            const r = line.match(regex);
            if (r && r.length > 0) result.push(r[1]);
        } else {
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}(?<values>[^\\]]*)`, "u");
            const fR = encodeLink(line).match(fullLineRegex);
            if (fR?.groups) { result.push(decodeLink(fR.groups.values)) };
            const inSentenceRegexBrackets = new RegExp(`\\[${inlineFieldRegex(attribute)}(?<values>[^\\]]+)?\\]`, "gu");
            const sRB = encodeLink(line).matchAll(inSentenceRegexBrackets);
            let next = sRB.next();
            while (!next.done) {
                if (next.value.groups) { result.push(decodeLink(next.value.groups.values)) }
                next = sRB.next()
            }
            const inSentenceRegexPar = new RegExp(`\\(${inlineFieldRegex(attribute)}(?<values>[^\\)]+)?\\)`, "gu");
            const sRP = encodeLink(line).matchAll(inSentenceRegexPar);
            next = sRP.next();
            while (!next.done) {
                if (next.value.groups) { result.push(decodeLink(next.value.groups.values)) }
                next = sRP.next()
            }
        }
    })
    return result;
}