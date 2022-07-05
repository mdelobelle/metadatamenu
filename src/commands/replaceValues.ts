import { App, TFile } from "obsidian";
import { inlineFieldRegex } from "src/utils/parser";

export async function replaceValues(app: App, file: TFile, attribute: string, input: string): Promise<void> {
    const content = await (await app.vault.cachedRead(file)).split('\n');
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const { position: { start, end } } = frontmatter;
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
            if (r && r.length > 0) {
                const inputArray = input ? input.replace(/(\,\s+)/g, ',').split(',') : [""];
                const newValue = inputArray.length == 1 ? inputArray[0] : `${inputArray.join(', ')}`;
                return `${r[1]}${attribute}${r[2]}${r[3]}:: ${newValue}`;
            } else {
                return line;
            }
        }
    })
    app.vault.modify(file, newContent.join('\n'));
}