# Api

API is accessible with `app.plugins.plugins["metadata-menu"].api`

### getValues

`getValues(fileOrFilePath: TFile | string, attribute: string)`

Takes a TFile containing the field and a string for the related field name

Returns an array with the values of the field

This is an asynchronous function, so you should await it.

### replaceValues
`replaceValues(fileOrFilePath: TFile | string, attribute: string, input: string)`

Takes a TFile containing the field, a string for the related field name, a new value for this field and updates the field with the new value

This is an asynchronous function, so you should await it.

### insertValues
`insertValues(fileOrFilePath: TFile | string, attribute: string, value: string, lineNumber: number, inFrontmatter: boolean, top: boolean)`

Takes a TFile, a string for the field name, a value for this field and insert the formatted field in the file at the line specified.

You'll have to specify if the field will be in frontmatter to apply YAML syntax

This is an asynchronous function, so you should await it.


### fieldModifier
`fieldModifier(dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> })`

Takes a dataview api instance, a page, a field name and optional attributes and returns a HTML element to modify the value of the field in the target note

### fileFields
`fileFields(fileOrFilePath: TFile | string)`

Takes a TFile or e filePath and returns all the fields in the document, both frontmatter and dataview fields, and returns a collection of analysis of those fields by metadatamenu:

```typescript
{
    (fieldName: string): {
        /* the value of the field in the file */
        value: string | undefined, 

        /* unicity of the field in the note: if false it means that this field appears more than once in the file */
        unique: boolean,

        /* the fileClass name applied to this field if there is a fileClass AND if the field is set in the fileClass or the fileClass it's inheriting from */
        fileClass: string | undefined,

        /* the fileClass query applied to this field if there is a fileClass
        AND if the file matches the query attached to this fileClass in the settings AND if the field is set in the fileClass or the fileClass it's inheriting from */
        fileClassQuery: string | undefined

        /* true if this fieldName is in "Globally ignored fields" in the plugin settings */
        ignoreInMenu: boolean | undefined,

        /* true if this field as a setting defined in the plugin settings or a fileClass and if the value is valid according to those settings */
        isValid: boolean | undefined,

        /* an object containing the options available for this field according to the plugin settings or the fileClass */
        options: Record<string, string> | undefined,

        /* wether the settings applied to this field come from a fileClass, the plugin settings or none  */
        sourceType: "fileClass" | "settings" | undefined,

        /* the type of the field according to the plugin settings or the fileClass  */
        type: "Input" | "Select" | "Multi" | "Cycle" | "Boolean" | "Number" | undefined

        /* the note containing the values for multi, cycle or select types when defined in the plugin settings  */
        valuesListNotePath: string | undefined
    }
}
```

### insertMissingFields
`insertMissingFields: (fileOrFilePath: string | TFile, lineNumber: number, inFrontmatter: boolean, after: boolean, asList: boolean, asComment: boolean, fileClassName?: string)`

Takes:
- a TFile or its path, 
- a line number, 
- asks wether insertion is in frontmatter (default : false),
- asks wether insertion is in after the line (default : false),
- asks wether insertion is as list (prepends `- `) (default : false),
- asks wether insertion is as comment (prepends `>`)  (default : false),
- asks wether insertion should only deal with one single fileClass' fields (default: all)

Inserts all missings fields of all (or one specified) fileClass fields at the line, with the format

This is an asynchronous function, so you should await it.
