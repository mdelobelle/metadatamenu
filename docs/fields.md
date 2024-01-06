# Metadata Menu fields

Metadata Menu manages fields thanks to fields definition.

A field can be identified in serveral sections of a markdown file:

## Fields in the frontmatter section
Called `Property`in Obsidian, fields in frontmatter are of form: `<name>: <value>`

## Fields in the body section of the file with dataview notation
Following Dataview notation, you can define fields:
- in the body of the file, occupying the full line `<name>:: <value>`
- inside a line in the body of the file, surrounded with brackets or parenthesis: `... (<name>:: value) ...`or `... [<name>:: <value>]...`

## Field definition
In order to give metadata menu the capability to manage a field, you'll have to set a definition for it. You can set a definition for a field in two places:
- in the [plugin settings](settings.md): the field definition will be applied to every file of your vault
- in a [fileClass](fileclass.md): the field definition will be applied to the files [mapped with this fileClass](fileclasses.md#file-mapping)

All fields defintions are composed of:
 - [common settings](#fields-common-settings)
 - specific options depending on their [type](#fields-types)

These options are translated in a [field object](#field-object-structure) stored:
- as a `fields` item in the [fileClass](fileclass.md) file for fileclasses fields
- as a `fields` item in the `data.json` file of the plugin's folder for [preset fields](settings.md#preset-field-settings)

### Field object structure

|key|value|
|---|-----|
|name|field name|
|type|[field type](general.md#field-types)|
|id  |unique string automatically generated to identify the field across the vault|
|options|specific options by field type|
|path|The path of the field in the parent herarchy:<br> - empty or "" if the field doesn't have a parent<br>  - <parent_id> if the field has a parent (e.g. field of type [Object](fields.md#object) or [ObjectList](fields.md#object-list))<br> - <grand_parent_id>____<parent_id> if the field has a parent that also has a parent<br> - .... any depth level is supported|

### Indexed Path

For each field instance in a file, the plugin computes an indexedPath attribute for each existing field in the plugin's index.

It is used to identify the field instance in an [ObjectList](fields.md#object-list) and has to be passed to the `id` attribute of the [postValues](api.md#postvalues) method.

It is composed of each parent `id` separated by `____`, the position in each parent object list next to the parent `id` between square brackets, and ends with the field's `id`


Example of a "Company" fileClass fields:
|Field name|Type|id|path|
|---|---|---|---|
|City|Input|HDERA||
|Employees|ObjectList|dx8Mth||
|Name|Input|7r1kwd|dx8Mth|
|Role|Input|PCNGE4|dx8Mth|
|Contact Info|Object|Y0dsfZ|dx8Mth|
|e-mail|Input|hRlSsW|dx8Mth____Y0dsfZ|
|phone number|Input|xLPW7T|dx8Mth____Y0dsfZ|

Example of computed indexedPath for each field in a file:

 `ACME.md`
```yaml
---
#Field                            # indexedPath
City: Paris                       # HDERA
Employees:                        # dx8Mth
  - Name: John Doe                # dx8Mth[0]____7r1kwd
    Role: CFO                     # dx8Mth[0]____PCNGE4
    Contact Info:                 # dx8Mth[0]____Y0dsfZ
      e-mail: john.doe@acme.ob    # dx8Mth[0]____Y0dsfZ____hRlSsW
      phone number: 1234567891    # dx8Mth[0]____Y0dsfZ____xLPW7T
  - Name: Ann Martin              # dx8Mth[1]____7r1kwd
    Role: CEO                     # dx8Mth[1]____PCNGE4
    Contact Info:                 # dx8Mth[1]____Y0dsfZ
      e-mail: ann.martin@acme.ob  # dx8Mth[1]____Y0dsfZ____hRlSsW
      phone number: 1234567890    # dx8Mth[1]____Y0dsfZ____xLPW7T
---
```

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
- [Media](fields.md#media): a field that will `Accept a link to a media file from your vault`
- [MultiMedia](fields.md#multi-media): a field that will `Accept multiple links to media files`
- [Date](fields.md#date): a field that will `Accept a date`
- [DateTime](fieldsmd.#datetime): a field that will `Accept a date with time`
- [Time](fieldsmd.#time): a field that will `Accept a time`
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

### Set a command for this field
If toggled, this field will be accessible with Obsidian's command palette.

You can set an icon for the button of the command in the mobile toolbar (icon names have to be one of the https://lucide.dev library)

### Frontmatter List display type

Defines the way that multi-value type fields ([Multi](fields.md#multi), [MultiFile](fields.md#multi-file)) are displayed in the frontmatter:
- As an array inline: `Field: [Value1, Value2]`
- As an indented list below the field name:
```
Field:
  - Value 1
  - Value 2
```

### Inline field style

[Inline fields](#fields-in-the-body-section-of-the-file-with-dataview-notation) can be automatically styled with four styles (you can mix them):
- bold,
- italic,
- strikethrough
- code

NB: the changes to these settings won't affect existing fields. The new style will be applied the next time the field's value has changed

## Field type

Select the [type](#field-type) of the field. The type of the field will define specific [controls](controls.md) (buttons, forms, ....) and validation to enter or modify values

> [!IMPORTANT]
> once saved, you won't be able to change the type of the field in order to avoid inconsistencies in the indexing.

If you really need to change the type of a field, and if you are sure that it won't cause any discrepancies in your data, you'll have to remove this field from the fileclass or the preset fields and create a new one with the same name and the new type.

Some types are only available in the frontmatter:
- [YAML](#yaml)
- [Object](#object)
- [Object List](#object-list)

## Nesting fields
If the preset fields or a fileclass contains at least one [Object](#object) or [Object List](#object-list) field, then you can nest fields.

Nesting a field (A) consists of setting an Object or Object List field (B) as a parent of (A)

Each field sharing the same parent will have the same "level".
If a field has no parent it is considered as "root" 

Field names are unique per level per fileClass, or unique per level in the preset Fields settings

Object and Object List field can also have parent, therefore you can nest "infinitely"

## Input

A basic type to store a string.

### options
You can define a template to help fill your `Input` field.

Every item enclosed in curly braces will be transformed into an input or a dropdown select in the field modal. You can modify the "templatized" text afterwards:
- {{Name}} will be transformed in an input field labeled "Name"
- {{color: ["red", "green", "blue"]}} will be transformed into a dropdown select field labelled "color" with 3 value: "red", "green" and "blue

### controls
- Field modal: text area with optional inputs and dropdown selects based ont the tempplate
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: in-cell value modifier

## Boolean

A type that accepts `true` or `false` values.

If the field's value is anything else than `true`, it will be mapped with `false`

### controls
- Field modal: choose value
- Command palette: toggle value
- Note Modal: toggle value
- Dataview table: toggle button

## Number

A type that accepts a number (int or float).

### options
You can define an optional:
- (increment/decrement) step
- minimum value
- maximum value

### controls
- Field modal: change value, increment, decrement
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: change value in-cell, increment, decrement

## Select

A type that accepts values from a list.

### options
You can define several sources for the values:
- a note path: each line of the target note will be an option for the dropdown selector
- a javascript function returning an array of string (dataview api is available with the `dv` keyword, the dv.current() variable is available with the `current` keyword)
- the setting form (add/edit/remove values one by one)

### controls
- Field modal: select value, clear value, add a new value to the settings
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal
- Inline value suggestor: choose a value from the list

## Cycle

A type that will cycle through values from a list.

### options
You can define several sources for the values:
- a note path: each line of the target note will be an option for the dropdown selector
- a javascript function returning an array of string (dataview api is available with the `dv` keyword, the dv.current() variable is available with the `current` keyword)
- the setting form (add/edit/remove values one by one)

#### `Cycle begins by a null value`
When set to true, the value of the field will be set to null if increasing one step after the last value of the list

### controls
- Command palette: move to the next value
- Note modal: move to the next value
- Dataview table: move to the next value
- Inline value suggestor: choose a value from the list


## Multi

A type that multiple values from a list.

### options
You can define several sources for the values:
- a note path: each line of the target note will be an option for the dropdown selector
- a javascript function returning an array of string (dataview api is available with the `dv` keyword, the dv.current() variable is available with the `current` keyword)
- the setting form (add/edit/remove values one by one)

### controls
- Field modal: select/unselect value(s), clear all values, add a new value to the settings
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal
- Inline value suggestor: choose a value from the list, type a comma to add another value...

## Date

A type that accepts a date. 

### options
You can define:
- the date format as defined in [moment.js](https://momentjs.com/docs/#/displaying/format/) library
- insert link by default: The date will be embedded in an internal link : `[[2024-01-01]]`
- Link path : if provided, the path will be explicitely included in the internal link : `[[Daily/Notes/2024-01-01]]`
- Define a shift interval: a value in [moment.js duration notation](https://momentjs.com/docs/#/durations/creating/)
- Choose a [cycle field](#cycle) belonging to this fileclass or preset fields that contains duration values. Each time you shift the date, the date will be added the current value, and the cycle field will be updated with the next value in the list. This "Interval field" can't be a [nested field](#nesting-fields)

#### Template for link path
You can use templates to build your path with the formating token syntax of [moment.js](https://momentjs.com/docs/#/parsing/string-format/). For example `Daily/Notes/{{YYYY}}/{{MM}}` will render `[[Daily/Notes/2024/01/2024-01-01]]`. That can be useful if you have split subfolder for your daily notes for example

### controls
- Field modal: input a date, choose a date from a datepicker, insert as link/as raw text, shift ahead
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal

if the plugin [Natural Language Dates](https://github.com/argenos/nldates-obsidian) is installed, you can use it in the field modal when typing the date in the input field

## Datetime

A type that accepts a date with time

### options
You can define:
- the time format as defined in [moment.js](https://momentjs.com/docs/#/displaying/format/) library
- Define a shift interval: a value in [moment.js duration notation](https://momentjs.com/docs/#/durations/creating/)
- Choose a [cycle field](#cycle) belonging to this fileclass or preset fields that contains duration values. Each time you shift the date, the time will be added the current value, and the cycle field will be updated with the next value in the list. This "Interval field" can't be a [nested field](#nesting-fields)

### controls
- Field modal: input a date, choose a date from a datepicker, insert as link/as raw text, shift ahead
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal


## Time

A type that accepts a time (hours, minutes, seconds, milliseconds)



### options
You can define:
- the date and time format as defined in [moment.js](https://momentjs.com/docs/#/displaying/format/) library
- Define a shift interval: a value in [moment.js duration notation](https://momentjs.com/docs/#/durations/creating/)
- Choose a [cycle field](#cycle) belonging to this fileclass or preset fields that contains duration values. Each time you shift the date, the date will be added the current value, and the cycle field will be updated with the next value in the list. This "Interval field" can't be a [nested field](#nesting-fields)

### controls
- Field modal: input a date, choose a date from a datepicker, insert as link/as raw text, shift ahead
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal


## File

A type that accepts an internal link to a file in your vault

### options
You can define :
- a [dataviewjs query](#dataview-query) returning an array of pages
- a javascript function to return an [alias](#alias) for each result
- a javascript function to [sort](#sorting-order) the results within the query

#### `Dataview query` 
It accepts a call to the api function dv.pages that will return pages from your vault according to this function. Dataview api can be accessed with the `dv` variable, and the current page (dv.page object) is available with the `current` variable

you’ll have to use dv.pages function explained here : https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/#dvpagessource

it takes a « source » (explained here https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/#dvpagessource):

you can also improve the filtering by applying a combination of other functions to the result returned by dv.pages(source):

dv.pages(…).where(…) 
dv.pages(…).filter(…)
dv.pages(…).limit(…)
etc
you can combine them:
dv.pages(…).where(…).limit(...)
see documentation here https://blacksmithgu.github.io/obsidian-dataview/api/data-array/#raw-interface

A good source of help to build dataview queries is the obsidian discord server > plugin-advanced > dataview : the community is really helpful there.

**Advanced usage**

1. If you want to suggest only the pages that are defined on a specific field inside your notes, you can write the following:

```
dv.pages().map(p => p.field)
```

where `field` is the name of the inline field you want to target. 


1. You can also return an array of links directly from this query. This means that you can retrieve the value of a single field in any of your files.

Example: 
```
dv.page("Jules Verne").books
```

This would work if you have a file named `Jules Verne.md` in your vault (its path doesn't matter) that contains an inline field named `books` filled with one or more links to other pages.


For both of the above use cases :
- only existing pages will appear in the suggestion
- frontmatter fields are not supported

#### `Alias`
It accepts a javascript instruction returning a string using dataview `page` attribute

example: `"🚀" + (page.surname || page.file.name)`


#### `Sorting order`
It accepts a javascript instruction returning a number using two files `a` and `b`

example 1: `a.basename < b.basename ? -1 : 1`

example 2: `a.stat.ctime - b.stat.ctime`


### commands
- Field modal: select a file, clear the value, type a string to filter the results
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal
- Inline value suggestor: choose a value from the list

## Multi File

A type that accepts amultiple internal links to files in your vault

### options
You can define :
- a [dataviewjs query](#dataview-query) returning an array of pages
- a javascript function to return an [alias](#alias) for each result
- a javascript function to [sort](#sorting-order) the results within the query

### commands
- Field modal: select/unselect a file, clear the values, type a string to filter the results
- Command palette: open field modal
- Note modal: open field modal
- Dataview table: open field modal
- Inline value suggestor: choose a value from the list, type a comma to add another value...

## Media
A type that accepts an internal link to a media file in your vault
### options
You can define :
- the folders where your media files are located
- the embed size for images
- display the media modal search as list or cards (gallery style)

## MultiMedia
Multiple media files

## Lookup

A lookup field will look for targetted fields (aka related field) in targetted notes (aka Dataview JS Query results) and display the result in a presistent manner. Unlike a dataview view, a lookup field will change the content of the file by updating the value of the lookup field. 
So even if you disable dataview plugin, the lookup field will still contain the value. 
Lookup fields can therefore be "published".

### `Lookup` options

#### `Pages to look for in your vault (DataviewJS Query)`

A DataviewJS query of the form `dv.pages(...)` that has to return a data array of `page` object (see [Dataview Pages source definition](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/#dvpagessource))

#### `Name of the related field`

The name of the field that the plugin should look for in pages returned by the query. The plugin will filter the results returned by the query with to match the value of the `related field` with the source note's link

#### `Type of output`

Lookup field can display the result in a very various ways:

##### Links list
Simple list of links of the notes matching the query, comma separated

##### Links indented list
Just like [Links list](#links-list), displayed as a bullet list below the field

##### Built-in Summarizing function

NB: For this option you'll have to set the name of the target field on which you want to apply the built-in function in the `Summarized field name` input (not necessary for the `CountAll` function)

- `Sum`: sum of the values of a specific field in the notes returned by the query 
- `Count`: Counts all pages matching the query where the "Summarized field" is non empty
- `CountAll`: Counts all the pages matching the query
- `Average`: Returns the average value of summarized fields in the pages matching the query
- `Max`: Returns the maximum value of summarized fields in the pages matching the query
- `Min`: Returns the minimum value of summarized fields in the pages matching the query

##### Custom list rendering function

like the [Links](#links) option, but you can customize the way each value is displayed. The object `page` is available (see [Dataview page object](https://blacksmithgu.github.io/obsidian-dataview/data-annotation/#pages) for all attributes available in the `page object`) and can be used to build your output.
The output has to be a string. 

##### Custom indented list rendering function

Just like the [Custom list](#custom-list-rendering-function). Displayed as a bullet list below the field

##### Custom summarizing function

like the [Built-in summarizing function](#built-in-summarizing-function) option but you can customize the function you want to apply on the data array of pages returned by the query. 

The `pages` [data array](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/#dvpagessource) object is available.

You have the write the code of the function, this function has to return something.

Example1: `return pages.length`

Example2: `const i=0.0;const sum = pages.reduce((p, c) => p + c["age"], i); return sum / pages.length`

### commands
- Command palette: update lookup field (if it is not auto-updated)
- Note modal: update lookup field (if it is not auto-updated)

### Example

If you have a lookup field `students` defined like this:
 - name: `students``
 - dataview query: `dv.pages("#student")``
 - Name of the related field: `School`
 - auto-update: true

If you have the following notes

```
John.md
==========
#student
School:: [[Princeton]]
```

```
Anna.md
==========
#student
School:: [[Princeton]]
```

```
Steve.md
==========
#student
School:: [[Princeton]]
```

```
Eric.md
==========
#student
School:: [[HEC]]
```

if you put `students::` field in the following files, you'll get the following results
```
HEC.md
==========
students:: [[Eric]] // auto-filled
```

```
Princeton.md
==========
students:: [[John]], [[Anna]], [[Steve]] // auto-filled
```

## Formula

A field that returns the result of a javascript function

### options
You can define :
- if the field will auto-update each time the content of your vault has changed (can slow down obsidian if you have many of those fields and a lot of files)
- a javascript function returning a value. (the dataview api is available with th `dv` keyword, the current dataview page object is available with the keyword `current`)


### commands
- Command palette: update lookup field (if it is not auto-updated)
- Note modal: update lookup field (if it is not auto-updated)

### example

if you have the field `mixed sum`defined like this:
- name: `mixed sum`
- auto-update: true
- javascript formula: `current.apples + current.bananas`

If you put the field `mixed sum::` in the following file, you'll get the following result
```
basket.md
=========
apples:: 7
bananas:: 3
mixed sum:: 10 // auto-calculated
```

## Canvas

A canvas field of a given note is automatically updated with other notes connected to it in a specific canvas.

### options
#### `Path of the canvas`
The path to canvas where you want to search for matching connexions

#### `Nodes to target from this note`
The direction of the edge connecting this node with other nodes:
- `Incoming`: only the nodes with edges pointing to this node will be triggered
- `Outgoing`: only the nodes to which this node is pointing will be triggered
- `Both Side`: every nodes connected to this node will be triggered

#### `Node matching colors`
Only the nodes connected to this node that have a color within the selected values will be triggered.
You can define custom color values on top of the 6 default colors available in the canvas

#### `Matching files`
You can define a dvJS query that will return files. Only the nodes connected to this node whom corresponding files belong to the dvJS query result will be triggered

#### `Edge matching color`
Only the nodes connected to this node with an edge that has a color within the selected values will be triggered.
You can define custom color values on top of the 6 default colors available in the canvas

#### `Edge matching from side`
Only the nodes connected to this node with an edge starting from the selected side values will be triggered.

#### `Edge matching to side`
Only the nodes connected to this node with an edge pointing to the selected side values will be triggered.

#### `Edge matching label`
Only the nodes connected to this node with an edge that has a label within the values list will be triggered.
You can remove a label from the list by clicking on the cross in the chip

#### `Add new matching label`
Add new labels to match with edge labels.

## Canvas Group
A canvas group field of a given note is automatically updated with names of matching groups their nodes belong to in a specific canvas.

### options
#### `Path of the canvas`
The path to canvas where you want to search for matching groups

#### `Group matching color`
Only the groups surrounding this node that have a color within the selected values will be triggered.
You can define custom color values on top of the 6 default colors available in the canvas

#### `Group matching label`
Only the groups surrounding this node with an edge that has a label within the values list will be triggered.
You can remove a label from the list by clicking on the cross in the chip

#### `Add new matching label`
Add new labels to match with groups labels.

## Canvas Group Link
Combination of the `Canvas` and the `Canvas Group` field options. This time, the field will target nodes linked to the groups the node belongs to

### options
- [canvas link options](#options-9)
- [canvas group options](#options-10)

## JSON
A simple JSON field that will be serialized when included as an inline-field, or as a "JSON in YAML" when included in the frontmatter. The properties in the JSON are "free" meaning that they are not tied to a field definition

### Commands
- Field modal: edit the JSON object
- Command palette: open field modal
- Note modal: open field modal

## Yaml
A simple YAML field. The properties in the YAML are "free" meaning that they are not tied to a field definition. This field type is only available in the frontmatter

### Commands
- Field modal: edit the YAML object
- Command palette: open field modal
- Note modal: open field modal

## Object
A field that acts as a **parent** for other fields. When created, it will appear in the the "Parent" dropdown selector of a field setting. This field is only available in the frontmatter section

### Commands
- Field modal: select the nested field to edit and trigger its "Field modal" command, add a missing child field to this object
- Command palette: open field modal
- Note modal: go to the note modal of this object, listing all children fields and access their commands, add a missing child field to this object

## Object List
A field that acts as a **parent** for other fields. When created, it will appear in the the "Parent" dropdown selector of a field setting. This field is only available in the frontmatter section. 

### Commands
- Field modal: select the nested set of fields to edit and open the corresponding object field modal, add a new item to this object list, remove an item from this object list
- Command palette: open field modal
- Note modal: go to the note modal of this object list, listing all items of the list, click on one item to access the Note modal page of the corresponding Object