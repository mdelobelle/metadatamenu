import MetadataMenu from "main";
import { TFile } from "obsidian";
import { Status } from "src/types/lookupTypes";
import { arraysAsStringAreEqual } from "./updateLookups";
import { Field } from "src/fields/Field";
import { valueModal } from "src/fields/models/Select";


export function cleanRemovedFormulasFromIndex(
    plugin: MetadataMenu
): void {

    const f = plugin.fieldIndex;
    for (const id of f.fileFormulaFieldLastValue.keys()) {
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
    const start = Date.now();
    if (forceUpdateOne) {
        MDM_DEBUG && console.log("forceUpdateOne", forceUpdateOne.file.path, forceUpdateOne.fieldName);
    }
    MDM_DEBUG && console.log("forceUpdateAll", forceUpdateAll);
    MDM_DEBUG && console.log("start update formulas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)

    if (!forceUpdateOne && !forceUpdateAll) {
        MDM_DEBUG && console.log("from event");
    }

    const f = plugin.fieldIndex;
    //1. flatten all file__formulaField in a Map
    const fileFormulasFields: Map<string, Field> = new Map();
    [...f.filesLookupAndFormulaFieldsExists].forEach(([filePath, fields]) => {
        fields.filter(field => field.type === "Formula").forEach(field => {
            const fileFormulaField = `${filePath}__calculated__${field.fileClassName || "presetField"}___${field.name}`
            fileFormulasFields.set(fileFormulaField, field)
        })
    });
    MDM_DEBUG && console.log(fileFormulasFields);
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
                f.fileFormulaFieldLastValue.set(id, newValue);
                f.fileFormulaFieldsStatus.set(`${filePath}__${fieldName}`, Status.upToDate);
                // MDM_DEBUG && console.log(`[updateFormulas] (!valueHasChanged) "${fieldName}": ${currentValue} -> ${newValue} (${filePath})`);
                return;
            } else {
                if (!shouldUpdate) {
                    f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.changed)
                    MDM_DEBUG && console.log(`[updateFormulas] (!shouldUpdate) Updated "${fieldName}": ${currentValue} -> ${newValue} (${filePath})`);
                } else {
                    f.pushPayloadToUpdate(filePath, [{ indexedPath: field.id, payload: { value: newValue } }])
                    f.fileFormulaFieldLastValue.set(id, newValue);
                    f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.upToDate);
                    MDM_DEBUG && console.log(`[updateFormulas] Updated "${fieldName}": ${currentValue} -> ${newValue} (${filePath})`);
                }
            }
        } catch {
            MDM_DEBUG && console.log(`Failed update formula "${fieldName}" (${filePath})`);
            f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.error);
        }
    }))
    MDM_DEBUG && console.log("finished update formulas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    //3 remove non existing formula fields from index, since those indexes aren't flushed each time
    cleanRemovedFormulasFromIndex(plugin);
}

export async function updateSingleFormula(
    plugin: MetadataMenu,
    forceUpdateOne: { file: TFile, fieldName: string },
): Promise<void> {
    /**
     * Contrary to updateFormula, we don't iterate on all the formulas to avoid
     * performance issues when updating several formulas.
     * Usually, the user wants to:
     * * call updateSingleFormula on several specific files 
     * * at the end, update all the other files that may be impacted. 
     *   Do this only once instead of doing it each time a file is updated
     * The user is responsible to call fieldIndex.applyUpdates() after this.
     */

    const start = Date.now();

    const f = plugin.fieldIndex;
    MDM_DEBUG && console.log("start update single formula", f.lastRevision, "->", f.dv?.api.index.revision)

    if (forceUpdateOne) {
        MDM_DEBUG && console.log("forceUpdateOne", forceUpdateOne.file.path, forceUpdateOne.fieldName);
    }


    // //1. flatten all file__formulaField in a Map
    // const fileFormulasFields: Map<string, Field> = new Map();
    // [...f.filesLookupAndFormulaFieldsExists].forEach(([filePath, fields]) => {
    //     fields.filter(field => field.type === "Formula").forEach(field => {
    //         const fileFormulaField = `${filePath}__calculated__${field.fileClassName || "presetField"}___${field.name}`
    //         fileFormulasFields.set(fileFormulaField, field)
    //     })
    // });

    const fields: Field[] | undefined = f.filesLookupAndFormulaFieldsExists.get(forceUpdateOne.file.path);
    if (fields === undefined) {
        MDM_DEBUG && console.log(`[updateSingleFormula] No fields (${forceUpdateOne.file.path})`);
        return;
    }
    const field: Field | undefined = fields.find((current_field: Field, index: number, obj: Field[]) => {
        return current_field.type === "Formula" && current_field.name == forceUpdateOne.fieldName;
    });
    if (field === undefined) {
        MDM_DEBUG && console.log(`[updateSingleFormula] No field "${forceUpdateOne.fieldName}" (${forceUpdateOne.file.path})`);
        return;
    }

    const id = `${forceUpdateOne.file.path}__calculated__${field?.fileClassName || "presetField"}___${field?.name}`

    // MDM_DEBUG && console.log(fileFormulasFields);
    //2. calculate formula and update file if value has changed
    // await Promise.all([...fileFormulasFields].map(async ([id, field]) => {
    const matchRegex = /(?<filePath>.*)__calculated__(?<fileClassName>.*)___(?<fieldName>.*)/
    const { filePath, fieldName } = id.match(matchRegex)?.groups || {}
    // const shouldUpdate =
    //     forceUpdateAll ||
    //     forceUpdateOne?.file.path === filePath && forceUpdateOne?.fieldName === fieldName ||
    //     field.options.autoUpdate === true
    // const _file = forceUpdateOne.file; //plugin.app.vault.getAbstractFileByPath(filePath)
    // if (!_file || !(_file instanceof TFile)) return
    const currentValue = `${f.fileFormulaFieldLastValue.get(id) || ""}`;
    try {
        const dvFile = f.dv.api.page(filePath)
        const newValue = (new Function("current, dv", `return ${field.options.formula}`))(dvFile, f.dv.api).toString();
        const valueHasChanged = (currentValue === undefined && newValue !== "") || !arraysAsStringAreEqual(currentValue, newValue) || currentValue !== newValue
        if (!valueHasChanged) {
            // f.fileFormulaFieldsStatus.set(`${filePath}__${fieldName}`, Status.upToDate);
            MDM_DEBUG && console.log(`[updateSingleFormula] (!valueHasChanged) "${fieldName}": ${currentValue} -> ${newValue} (${filePath})`);
            return;
        } else {
            // if (!shouldUpdate) {
            //     f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.changed)
            // } else {
            f.pushPayloadToUpdate(filePath, [{ indexedPath: field.id, payload: { value: newValue } }])
            f.fileFormulaFieldLastValue.set(id, newValue);
            f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.upToDate);
            MDM_DEBUG && console.log(`[updateSingleFormula] Updated "${fieldName}": ${currentValue} -> ${newValue} (${filePath})`);

            // }
        }
    } catch {
        MDM_DEBUG && console.log(`Failed update single formula "${fieldName}" (${filePath})`);
        f.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.error);
    }
    // }))
    MDM_DEBUG && console.log("finished update single formula", f.lastRevision, "->", f.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    // //3 remove non existing formula fields from index, since those indexes aren't flushed each time
    // cleanRemovedFormulasFromIndex(plugin);
}

