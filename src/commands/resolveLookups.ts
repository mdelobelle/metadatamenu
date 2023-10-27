import MetadataMenu from "main";
import { TFile } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import { Status } from "src/types/lookupTypes";

export function resolveLookups(plugin: MetadataMenu, source: string = ""): void {
    /*
    1. first resolve all existing lookup queries from their definitions in fileClasses and settings
    -> lookupQueryResults
    2. then assign results to all files having implemented a lookupfield, update their status
    -> index.fileLookupFiles
    -> index.fileLookupFieldsStatus
    */

    const index = plugin.fieldIndex;
    //first resolve all existing lookup queries from their definitions in fileClasses and settings
    const lookupQueryResults: Map<string, any[]> = new Map();
    [...index.lookupQueries].forEach(([lookupName, field]) => {
        const queryRelatedDVFiles = (new Function("dv", `return ${field.options.dvQueryString}`))(index.dv.api).values as Array<any>;
        //console.log(lookupName, queryRelatedDVFiles)
        //console.log("NEW LOOKUP FILES", lookupName, queryRelatedDVFiles)
        lookupQueryResults.set(lookupName, queryRelatedDVFiles);

    });
    //then assign results to all files having implemented a lookupfield
    [...index.filesLookupAndFormulaFieldsExists].forEach(([filePath, fields]) => {
        fields.filter(field => field.type === FieldType.Lookup).forEach(lookupField => {
            //for all lookup fields in files that have lookupfields:
            //1. get the query results
            const queryRelatedDVFiles = lookupQueryResults.get(`${lookupField.fileClassName || "presetField"}___${lookupField.name}`) || [];
            //2. filter those results by their targetField content including this file //
            const fileRelatedDVFiles = queryRelatedDVFiles.filter(dvFile => {
                const targetValue = dvFile[lookupField.options.targetFieldName];
                if (Array.isArray(targetValue)) {
                    return targetValue.filter(v => index.dv.api.value.isLink(v)).map(v => v.path).includes(filePath)
                } else {
                    return targetValue?.path === filePath
                }
            })
            //3. assign those results to fileLookupFiles
            const relatedFieldName = `${filePath}__related__${lookupField.fileClassName || "presetField"}___${lookupField.name}`
            const existingFileLookupFields = index.fileLookupFiles.get(relatedFieldName)
            index.fileLookupFiles.set(relatedFieldName, fileRelatedDVFiles)
            //console.log(existingFileLookupFields, relatedFieldName, fileRelatedDVFiles)
            //4. reset Previous results count to current value
            if (!(index.fileLookupFieldsStatus.get(`${filePath}__${lookupField.name}`) === Status.changed)) {
                index.previousFileLookupFilesValues.set(relatedFieldName, (existingFileLookupFields || fileRelatedDVFiles).length)
            }
            //5. change the status of this lookup field
            index.fileLookupFieldsStatus.set(`${filePath}__${lookupField.name}`, Status.changed)
        })
    })
    //remove non existing lookup fields from index, since those indexes aren't flushed each time
    for (let id of index.fileLookupFiles.keys()) {
        const matchRegex = /(?<filePath>.*)__related__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fileClassName, fieldName } = id.match(matchRegex)?.groups || {}
        const existingLookFieldWithNameAndFileClassName = index.filesFields
            .get(filePath)?.find(field =>
                (field.name === fieldName) &&
                (
                    (field.fileClassName === undefined && fileClassName === "presetField") ||
                    (field.fileClassName === fileClassName)
                )
            )
        const dvPage = index.dv.api.page(filePath);
        if (dvPage === undefined || dvPage[fieldName] === undefined || !existingLookFieldWithNameAndFileClassName) {
            index.fileLookupFiles.delete(id);
            index.fileLookupFieldLastValue.delete(id);
            index.fileLookupFieldLastOutputType.delete(id);
            index.previousFileLookupFilesValues.delete(id);
            index.fileLookupFieldsStatus.delete(`${filePath}__${fieldName}`)
        }
    }
}
