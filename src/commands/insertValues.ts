import { App, TFile } from "obsidian";

export async function insertValues(
    app: App,
    fileOrFilePath: TFile | string,
    fieldName: string,
    value: string,
    lineNumber?: number,
    inFrontmatter?: boolean,
    top?: boolean
): Promise<void> {

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
    const result = await app.vault.read(file)
    let newContent: string[] = [];
    if (top) {
        newContent.push(`${fieldName}${inFrontmatter ? ":" : "::"} ${value}`);
        result.split("\n").forEach((line, _lineNumber) => newContent.push(line));
    } else {
        result.split("\n").forEach((line, _lineNumber) => {
            if (_lineNumber == lineNumber) {
                newContent.push(`${fieldName}${inFrontmatter ? ":" : "::"} ${value}`);
            };
            newContent.push(line);
        });
    };
    app.vault.modify(file, newContent.join('\n'));
}