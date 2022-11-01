import MetadataMenu from "main";
import { Notice } from "obsidian";
import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";
import { replaceValues } from "./replaceValues";


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
    plugin: MetadataMenu
): Promise<void> {
    const start = Date.now()
    //console.log("start update formulas [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    let renderingErrors: string[] = [];
    //1. flatten all file__formulaField in a Map
    const fileFormulasFields: Map<string, Field> = new Map();
    [...f.filesFieldsExists].forEach(([filePath, fields]) => {
        fields.filter(field => field.type === FieldType.Formula).forEach(field => {
            fileFormulasFields.set(filePath, field)
        })
    });
    //2. calculate formula and update file if value has changed
    [...fileFormulasFields].forEach(async ([filePath, field]) => {
        const id = `${filePath}__calculated__${field.fileClassName || "presetField"}___${field.name}`;
        const dvFile = f.dv.api.page(filePath)
        const currentdvValue = dvFile && dvFile[field.name]
        const currentValue = currentdvValue ? currentdvValue.toString() : ""
        f.fileFormulaFieldLastValue.set(id, currentValue);
        try {
            const newValue = (new Function("current, dv", `return ${field.options.formula}`))(dvFile, f.dv.api).toString();
            if ((!currentValue && newValue !== "") || currentValue !== newValue) {
                await plugin.fileTaskManager.pushTask(() => replaceValues(plugin, filePath, field.name, newValue));
                f.fileFormulaFieldLastValue.set(id, newValue);
            }
        } catch {
            if (renderingErrors.includes(field.name)) renderingErrors.push(field.name)
        }
    })
    if (renderingErrors.length) new Notice(`Those fields have incorrect output rendering functions:\n${renderingErrors.join(",\n")}`);
    //console.log("finished update lookups [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    //3 remove non existing formula fields from index, since those indexes aren't flushed each time
    cleanRemovedFormulasFromIndex(plugin);
}
