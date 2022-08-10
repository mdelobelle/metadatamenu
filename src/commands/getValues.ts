import { App, TFile } from "obsidian"
import { inlineFieldRegex } from "src/utils/parser";

export async function getValues(app: App, fileOrfilePath: TFile | string, attribute: string): Promise<string[]> {
    let file: TFile;
    if (fileOrfilePath instanceof TFile) {
        file = fileOrfilePath;
    } else {
        const _file = app.vault.getAbstractFileByPath(fileOrfilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const content = (await app.vault.cachedRead(file)).split('\n');
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const { position: { start, end } } = frontmatter ? frontmatter : { position: { start: undefined, end: undefined } };
    const result: string[] = [];
    content.map((line, i) => {
        if (frontmatter && i >= start.line && i <= end.line) {
            const regex = new RegExp(`${attribute}:(.*)`, 'u');
            const r = line.match(regex);
            if (r && r.length > 0) result.push(r[1]);
        } else {
            const fullLineRegex = new RegExp(`^${inlineFieldRegex(attribute)}`, "u");
            const fR = line.match(fullLineRegex);
            if (fR?.groups) { result.push(fR.groups.values) };
            const inSentenceRegex = new RegExp(`(?<=\\[)${inlineFieldRegex(attribute)}(?=\\])`, "gu");
            const sR = line.matchAll(inSentenceRegex);
            let next = sR.next();
            while (!next.done) {
                if (next.value.groups) { result.push(next.value.groups.values) }
                next = sR.next()
            }
        }
    })
    return result;
}