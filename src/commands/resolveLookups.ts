import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";
import { Status } from "src/types/lookupTypes";

export function resolveLookups(plugin: MetadataMenu, source: string = ""): void {
    const f = plugin.fieldIndex;
    //first resolve all existing lookup queries from their definitions in fileClasses and settings
    const lookupQueryResults: Map<string, any[]> = new Map();
    [...f.lookupQueries].forEach(([lookupName, field]) => {
        const queryRelatedDVFiles = (new Function("dv", `return ${field.options.dvQueryString}`))(f.dv.api).values as Array<any>;
        lookupQueryResults.set(lookupName, queryRelatedDVFiles);

    });
    //then assign results to all files having implemented a lookupfield
    [...f.filesFieldsExists].forEach(([filePath, fields]) => {
        fields.filter(field => field.type === FieldType.Lookup).forEach(lookupField => {
            //for all lookup fields in files that have lookupfields:
            //1. get the query results
            const queryRelatedDVFiles = lookupQueryResults.get(`${lookupField.fileClassName || "presetField"}___${lookupField.name}`) || [];
            //2. filter those results by their targetField content including this file //
            const fileRelatedDVFiles = queryRelatedDVFiles.filter(dvFile => {
                const targetValue = dvFile[lookupField.options.targetFieldName];
                if (Array.isArray(targetValue)) {
                    return targetValue.filter(v => f.dv.api.value.isLink(v)).map(v => v.path).includes(filePath)
                } else {
                    return targetValue?.path === filePath
                }
            })
            //3. assign those results to fileLookupFiles
            const relatedFieldName = `${filePath}__related__${lookupField.fileClassName || "presetField"}___${lookupField.name}`
            const existingFileLookupFields = f.fileLookupFiles.get(relatedFieldName)
            f.fileLookupFiles.set(relatedFieldName, fileRelatedDVFiles)
            //4. reset Previous results count to current value
            if (!(f.fileLookupFieldsStatus.get(`${filePath}__${lookupField.name}`) === Status.changed)) f.previousFileLookupFilesValues.set(relatedFieldName, (existingFileLookupFields || fileRelatedDVFiles).length)
            //5. change the status of this lookup field
            f.fileLookupFieldsStatus.set(`${filePath}__${lookupField.name}`, Status.changed)
        })
    })
    //remove non existing lookup fields from index, since those indexes aren't flushed each time
    for (let id of f.fileLookupFiles.keys()) {
        const matchRegex = /(?<filePath>.*)__related__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fileClassName, fieldName } = id.match(matchRegex)?.groups || {}
        const existingLookFieldWithNameAndFileClassName = f.filesFields
            .get(filePath)?.find(field =>
                (field.name === fieldName) &&
                (
                    (field.fileClassName === undefined && fileClassName === "presetField") ||
                    (field.fileClassName === fileClassName)
                )
            )
        const dvPage = f.dv.api.page(filePath);
        if (dvPage === undefined || dvPage[fieldName] === undefined || !existingLookFieldWithNameAndFileClassName) {
            f.fileLookupFiles.delete(id);
            f.fileLookupFieldLastValue.delete(id);
            f.fileLookupFieldLastOutputType.delete(id);
            f.previousFileLookupFilesValues.delete(id);
            f.fileLookupFieldsStatus.delete(`${filePath}__${fieldName}`)
        }
    }
}