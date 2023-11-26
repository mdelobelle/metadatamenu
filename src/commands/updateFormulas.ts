import MetadataMenu from "main";
import { TFile } from "obsidian";
import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";
import { Status } from "src/types/lookupTypes";
import { arraysAsStringAreEqual } from "./updateLookups";


export function cleanRemovedFormulasFromIndex(
    plugin: MetadataMenu
): void {

    const f = plugin.fieldIndex;
    for (let id of f.fileFormulaFieldLastValue.keys()) {
        const matchRegex = /(?<filePath>.*)__calculated__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fileClassName, fieldName } = id.match(matchRegex)?.groups || {}
        const existingFormulaFieldWithNameAndFileClassName = f.filesFields
            .get(filePath)?.find(field =>
                (field.name === fieldName) &&
                (
                    (field.fileClassName === undefined && fileClassName === "presetField") ||
                    (field.fileClassName === fileClassName)
                )
            )
        const dvPage = f.dv.api.page(filePath);
        if (dvPage === undefined || dvPage[fieldName] === undefined || !existingFormulaFieldWithNameAndFileClassName) {
            f.fileFormulaFieldLastValue.delete(id);
        }
    }
}

export async function updateFormulas(
    plugin: MetadataMenu,
    forceUpdateOne?: { file: TFile, fieldName: string },
    forceUpdateAll: boolean = false
): Promise<void> {
    const start = Date.now()
    DEBUG && console.log("start update formulas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    //1. flatten all file__formulaField in a Map
    const fileFormulasFields: Map<string, Field> = new Map();
    [...f.filesLookupAndFormulaFieldsExists].forEach(([filePath, fields]) => {
        fields.filter(field => field.type === FieldType.Formula).forEach(field => {
            const fileFormulaField = `${filePath}__calculated__${field.fileClassName || "presetField"}___${field.name}`
            fileFormulasFields.set(fileFormulaField, field)
        })
    });
    //2. calculate formula and update file if value has changed
    await Promise.all([...fileFormulasFields].map(async ([id, field]) => {
        const matchRegex = /(?<filePath>.*)__calculated__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fileClassName, fieldName } = id.match(matchRegex)?.groups || {}
        const shouldUpdate =
            forceUpdateAll ||
            forceUpdateOne?.file.path === filePath && forceUpdateOne?.fieldName === fieldName ||
            field.options.autoUpdate === true
        const _file = plugin.app.vault.getAbstractFileByPath(filePath)
        if (!_file || !(_file instanceof TFile)) return
        const currentValue = `${f.fileFormulaFieldLastValue.get(id) || ""}`;
        try {
            const dvFile = f.dv.api.page(filePath)
            const newValue = (new Function("current, dv", `return ${field.options.formula}`))(dvFile, f.dv.api).toString();
            const valueHasChanged = (currentValue === undefined && newValue !== "") || !arraysAsStringAreEqual(currentValue, newValue) || currentValue !== newValue
            if (!valueHasChanged) {
                f.fileFormulaFieldsStatus.set(`${filePath}__${fieldName}`, Status.upToDate);
                return;
            } else {
                if (!shouldUpdate) {
                    f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.changed)
                } else {
                    f.pushPayloadToUpdate(filePath, [{ id: field.id, payload: { value: newValue } }])
                    f.fileFormulaFieldLastValue.set(id, newValue);
                    f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.upToDate)
                }
            }
        } catch {
            f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.error)
        }
    }))
    DEBUG && console.log("finished update formulas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    //3 remove non existing formula fields from index, since those indexes aren't flushed each time
    cleanRemovedFormulasFromIndex(plugin);
}
