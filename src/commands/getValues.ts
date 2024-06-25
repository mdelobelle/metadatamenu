import MetadataMenu from "main";
import { TFile } from "obsidian"
import { ExistingField } from "src/fields/ExistingField";
import { Note } from "src/note/note";

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
    const eF = await Note.getExistingFields(plugin, file);
    return eF.filter(_ef => _ef.field.name === attribute).map(_eF => _eF.value);
}



export async function getExistingFieldForIndexedPath(
    plugin: MetadataMenu,
    fileOrfilePath: TFile | string,
    indexedPath: string
): Promise<ExistingField | undefined> {
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
    const eF = await Note.getExistingFieldForIndexedPath(plugin, file, indexedPath)
    return eF
}

export async function getValuesForIndexedPath(plugin: MetadataMenu, fileOrfilePath: TFile | string, indexedPath: string): Promise<string> {
    const eF = await getExistingFieldForIndexedPath(plugin, fileOrfilePath, indexedPath)
    return eF?.value
}