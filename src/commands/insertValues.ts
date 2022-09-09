import MetadataMenu from "main";
import { MarkdownView, TFile } from "obsidian";

export async function insertValues(
    plugin: MetadataMenu,
    fileOrFilePath: TFile | string,
    fieldName: string,
    value: string,
    lineNumber?: number,
    inFrontmatter?: boolean,
    after: boolean = true
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
    const result = await plugin.app.vault.read(file)
    let newContent: string[] = [];

    result.split("\n").forEach((line, _lineNumber) => {
        if (_lineNumber == lineNumber) {
            if (after) newContent.push(line);
            newContent.push(`${fieldName}${inFrontmatter ? ":" : "::"} ${value}`);
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