import MetadataMenu from "main";
import { MarkdownView, TFile } from "obsidian";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { insertFrontmatterWithFields } from "./insertFrontmatterWithFields";

/* DEPRECATED */

export async function insertValues(
    plugin: MetadataMenu,
    fileOrFilePath: TFile | string,
    fieldName: string,
    value: string,
    lineNumber?: number,
    inFrontmatter?: boolean,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
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
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontmatter = cache?.frontmatter
    if (inFrontmatter && lineNumber == -2 && !frontmatter) {
        const fields: Record<string, string> = {}
        fields[fieldName] = value
        await insertFrontmatterWithFields(plugin, file, fields);
    } else {
        const result = await plugin.app.vault.read(file)
        let newContent: string[] = [];
        const targetLineNumber = inFrontmatter && lineNumber == -2 && frontmatter ?
            getFrontmatterPosition(plugin, file).end.line - 1 : lineNumber
        result.split("\n").forEach((line, _lineNumber) => {
            if (_lineNumber == targetLineNumber) {
                if (after) newContent.push(line);
                const newLine = `${!inFrontmatter && asComment ? ">" : ""}${!inFrontmatter && asList ? "- " : ""}${fieldName}${inFrontmatter ? ":" : "::"} ${value}`;
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

}