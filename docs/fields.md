# Metadata Menu fields

Metadata Menu manages fields thanks to fields definition.

A field can be identified in serveral sections of a markdown file:
- in the frontmatter: `<name>: <value>`
- in the body of the file, occupying the full line `<name>:: <value>`
- inside a line in the body of the file, surrounded with brackets or parenthesis: `... (<name>:: value) ...`or `... [<name>:: <value>]...`

In order to give metadata menu the capability to manage a field, you'll have to set a definition for it. You can set a definition for a field in two places:
- in the [plugin settings](settings.md): the field definition will be applied to every file of your vault
- in a [fileClass](fileclass.md): the field definition will be applied to the files [mapped with this fileClass](fileclasses.md#file-mapping)

All fields defintions are composed of:
 - [common settings](#field-settings)
 - specific options depending on their [type](#fields-types)

## Fields Types
Metadata Menu can manage several field types. Choose them depending on the kind of data that you want to put in your field:

- [Input](fields.md#input) : this is the default type. it will `Accept any value`
- [Boolean](fields.md#boolean): a field that can `Accept true or false` or null value
- [Number](fields.md#number): a field that can `Accept a number`
- [Select](fields.md#select): a field that can `Accept a single value from a list`
- [Multi](fields.md#multi): a field that can `Accept multiple values from a list`
- [Cycle](fields.md#cycle): a field that will `Cycle through values from a list`
- [File](fields.md#file): a field that will `Accept a link to a file from your vault`
- [MultiFile](fields.md#multi-file): a field that will `Accept multiple links`
- [Date](fieldsmd.#date): a field that will `Accept a date`
- [Lookup](fields.md#lookup): a field that will `Accept a lookup query`
- [Formula](fields.md#formula): a field that will `Make Calculation based on note's fields`
- [Canvas](fields.md#canvas): a field that will `Update with links in a canvas`
- [Canvas Group](fields.md#canvas-group): a field that will `Update with groups in a canvas`
- [Canvas Group Link](fields.md#canvas-group-link): a field that will `Update with groups links in a canvas`
- [JSON](fields.md#json): a field that will `Accept a JSON object`
- [YAML](fieldsmd.#yaml): a field that will `Accept a YAML object`
- [Object](fields.md#object): a field that will `Accept a collection of fields`
- [Object List](fields.md#object-list): a field that will `Accept a list of collection of fields`

## Fields common settings

### Field name
The name of the field - case sensitive.

Metadata menu will search for this name to parse the files mapping the [fileclass](fileclasses.md) (if the file is [mapping](fileclasses.md#file-mapping) at least one fileclass) or all files if no fileClass is defined unless this field or the files are [excluded](settings.md#globally-ignored-fields) from indexing

A field's name is unique [for a given level](#nesting-fields) per [fileclass](fileclasses.md) (or within the [preset fields](settings.md#preset-field-settings))

### Parent
This setting is available if there is at least one [Object](fields.md#object) or [Object List](fields.md#object-list) field created for this [fileclass](fileclasses.md) or in the [preset fields](settings.md#preset-field-settings)

Some field types can't have parents (they can't be nested): [Lookup](fields.md#lookup), [Formula](fields.md#formula), [Canvas](fields.md#canvas), [Canvas Group](fields.md#canvas-group), [Canvas Group Link](fields.md#canvas-group-link)

### 

### Set a command for this field
If toggled, this field will be accessible with Obsidian's command palette.

You can set an icon for the button of the command in the mobile toolbar (icon names have to be one of the https://lucide.dev library)

## Nesting fields
If the preset fields or a fileclass contains at least one Object or Object List field, then you can nest fields.

Nesting a field (A) consists of setting an Object or Object List field (B) as a parent of (A)

Each field sharing the same parent will have the same "level".
If a field has no parent it is considered as "root" 

Field names are unique per level per fileClass, or unique per level in the preset Fields settings

Object and Object List field can also have parent, therefore you can nest "infinitely"

## Input

A basic type to store a string.

You can define a template to help fill your `Input` field.

Every item enclosed in curly braces will be transformed into an input or a dropdown select in the field modal. You can modify the "templatized" text afterwards:
- {{Name}} will be transformed in an input field labeled "Name"
- {{color: ["red", "green", "blue"]}} will be transformed into a dropdown select field labelled "color" with 3 value: "red", "green" and "blue

## Boolean

## Number

## Select

## Multi

## File

## Multi File

## Date

## Lookup

## Formula

## Canvas

## Canvas Group

## Canvas Group Link

## JSON

## Yaml

## Object

## Object List
