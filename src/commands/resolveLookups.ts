import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";

export function resolveLookups(plugin: MetadataMenu): void {
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
            index.fileLookupFiles.set(relatedFieldName, fileRelatedDVFiles)
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
            index.fileLookupFieldsStatus.delete(`${filePath}__${fieldName}`)
        }
    }
}
