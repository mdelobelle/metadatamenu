import MetadataMenu from "main";
import { MarkdownView, TFile } from "obsidian";

export async function insertFrontmatterWithFields(
    plugin: MetadataMenu,
    fileOrFilePath: TFile | string,
    fields: Record<string, string>,
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
    const content = await plugin.app.vault.read(file)
    const frontmatter = "---\n" + Object.entries(fields).map(([fieldName, value]) => `${fieldName}: ${value}`).join("\n") + ("\n---\n")

    await plugin.app.vault.modify(file, frontmatter + content);
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
    if (editor) {
        const lineNumber = editor.getCursor().line
        editor.setCursor({ line: editor.getCursor().line, ch: editor.getLine(lineNumber).length })
    }
}