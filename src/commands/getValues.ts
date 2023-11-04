import MetadataMenu from "main";
import { TFile } from "obsidian"
import { ExistingField } from "src/fields/ExistingField";
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
    const eF = await ExistingField.getExistingFieldsFromIndexForFilePath(plugin, file)
    return eF.filter(_ef => _ef.field.name === attribute).map(_eF => _eF.value)
}

export async function getValuesForIndexedPath(plugin: MetadataMenu, fileOrfilePath: TFile | string, indexedPath: string): Promise<string> {
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
    const eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(plugin, file, indexedPath)
    return eF?.value
}