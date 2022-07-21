import { App, TFile } from "obsidian"
import { inlineFieldRegex } from "src/utils/parser";

export async function getValues(app: App, file: TFile, attribute: string): Promise<string[]> {
    const content = await (await app.vault.cachedRead(file)).split('\n');
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const { position: { start, end } } = frontmatter || null;
    const result: string[] = [];
    content.map((line, i) => {
        if (frontmatter && i >= start.line && i <= end.line) {
            const regex = new RegExp(`${attribute}:(.*)`, 'u');
            const r = line.match(regex);
            if (r && r.length > 0) result.push(r[1]);
        } else {
            const regex = inlineFieldRegex(attribute);
            const r = line.match(regex);
            if (r?.groups) result.push(r.groups.values);
        }
    })
    return result;
}