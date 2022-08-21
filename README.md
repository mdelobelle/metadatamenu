# Metadata Menu
This plugin is made for data quality enthousiasts: access and manage the metadata of your notes in Obsidian.

Metadata Menu adds context menu items to modifiy target note's frontmatter fields and "inline fields" (dataview syntax) by right-clicking on the link, or within dataview tables

You can define preset types and values for those fields globally in the plugin's settings or on a file-by-file basis thanks to fileClass definition

It also enables frontmatter of inline-field autocompletion with suggested values based on preset values.

demo 1: basic features, settings and field types
https://youtu.be/7bvIAkJf0OE

demo 2: autocompletion and "in sentence" fields commands
https://youtu.be/gU-StGyDciY 

demo 3: File type fields
https://youtu.be/sYudigxPEnY

demo 4: Date type fields
https://youtu.be/PrbYaVh7N7g


# General concepts

Metadata Menu can manage any metadata field located in frontmatter (YAML syntax) or in the body of the note with the syntax `field::` (dataview style)

## Field Types
Metadata Menu gives a type to each field.
Available types are:
- `Input` (free text) : this is the default type applied to each field if nothing is set for this field (see #Field settings). it will `Accept any value`
- `Boolean`: a field that can `Accept true or false` or null value
- `Number`: a field that can `Accept a number` (float) value, optionaly within a range (`min`, `max`) and can be in/decremented by a `step` value (default 1) 
- `Select`: a field that can `Accept a single value from a list`
- `Multi`: a field that can `Accept multiple values from a list`
- `Cycle`: a field that will `Cycle through values from a list`
- `File`: a field that will `Accept a link to a file from your vault`
- `Date`: a field that will `Accept a date`

## Field settings
By default each field is an `Input`

You can define a `field setting` for each field.

A field setting is composed of:
- a name
- a type (see ## Field Types list above)
- options depending on the type

A field setting can defined in:
- Metadata Menu settings (see # Metadata Menu Settings)
- in a fileClass note (see # Fileclass)

> NB: if a field has a setting defined in the Metadata Menu settings AND in a fileClass note, the setting of the fileClass will take the priority over the setting defined in Metadata Menu settings

## Controls
a Field can be modified or added from several locations:
- autocompletion within the editor mode
- Obsidian and plugins menus : file explorer, note, calendar, context menu of a link, many other plugins not fully tested ...
- dataview table if you have dataview plugin installed

# Metadata Menu settings

## Global settings

### `Display field options in context menu`

if toggled `on` : Metadata Menu will display one control item per field in the target note in the context menu. That could result in a very large context menu if the target note has many fields

if toggled `off` : Metadata Menu will display a "Field Options" item in the context menu. You can access control items through a modal display by clicking on "Field Options".

### `Globally ignored fields`
the fields listed here (comma separated) won't be available in context menus

### `First day of week`
For `Date` fields' datepicker, select the day the week should start with (default `Monday`)

## Preset Field settings

If you want a field to be globally managed throughout your whole vault you can `add a new field setting`:
- Click on "+"
- Type the field name
- Select the type of field (see ## Field Types)
- Set the options

### `Select`, `Multi`, `Cycle` options

#### `Path of the note containing the values`
You can define the list of values in a note. This note must contain a value per line. You have to type the full path to the note in the `Path of the note containing the values` field (don't forget the .md extension)

#### `Preset options`
you can add preset values (options) directly in the setting form by clicking the `Add` button in the `Preset Options` section.
You can rearrange the order of the options.

This order is used to display the values in the dropdown lists and is the order used to cycle through values.

> If both `Path of the note containing the values` and `preset options`, the first one will have the priority.

### `Input` options

You can define a template to help fill your `Input` field.

Every item enclosed in curly braces will be transformed into an input or a dropdown select in the field modal

#### standard input

syntax : `{{name}}`

#### dropdown select input

syntax : `{{level: ["Beginner", "Intermediate", "Advanced"]}}`

### `Number` options

#### Step
If `step` (float) is defined, its value will be used to decrement or increment the field.
If `step` is not defined, increment and decrement will be done with a step of `1`

#### `Min`
If `min` (float) is defined, you won't be able to set or change the value of the field with a value less than `min` (an error will be displayed)

#### `Max`
If `max` (float) is defined, you won't be able to set or change the value of the field with a value greater than `max` (an error will be displayed)

### `File` options
`Dataview query` accepts a call to the api function dv.pages that will return pages from your vault according to this function. 

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

### `Date` options

#### `Date Format`
The output format of the date as string following moment.js's syntax for formatting tokens : https://momentjs.com/docs/#/displaying/format/

#### `Link path`
If you want to render your date as a link to a note, specify the path of the folder where the note should be.

#### `Insert as link by default`
Toggle `on` if you want the option to insert the date as a link to be selected by default when creating/modifying a date field.

## Fileclass settings
If you want the same field to have different behaviours depending on the note they belong to, you can define field settings based on the "class" of the "note".
This is a particular frontmatter attribute that you will have to give to your note.
By default, this attribute is named `fileClass`

A FileClass is a specific note located in a defined folder. In this note you will set the fields settings for each note that has a `fileClass` attribute equal to the name of the `fileClass` note (without .md extension).

> See # Fileclass section for details about how to write a fileClass

### fileClass files folder
In Metadata Menu, you'll have to set the location of `fileClass` notes: type the path to the fileClass files folder in the `class Files Path` setting (don't forget the trailing slash)

### fileClass alias
You may find usefull to combine the fileClass attribute with an other attribute that you already use to categorize your notes (category, type, kind, area, ....). 

You can give an alias to fileClass attribute in `fileClass field alias` setting so that you can use the same name to manage the fields and for your other current usage.

### Global fileClass
You can define a fileClass that will be applicable to all of your notes, even if there is no fileClass attribute defined in their frontmatter.

This is usefull if you are more confortable with setting your preset fields in a note rather than in the plugin settings.

If global fileClass is null or unproperly configured, the preset fields defined in the plugin settings will have the priority.

### fileClass queries
You can define fileClasses to be applicable to every file matching a dataview query. (same syntax as for `File` type fields)

If a File matches several queries, the last matching fileClass (starting from the top) will be applicable to this file.

## Migrate
Historically most of this plugin's features were available in `Supercharged links` plugin.

In order to better scale, those features have been removed from `Supercharged links`. By clicking the `Copy` button, you can import the settings from `Supercharged links` to avoid setting everything again from the ground up.

> Warning: this will replace your whole settings, so be cautious not to override your work.

# Controls

## Control field with autocompletion
In Editor mode, type ":" after a field in frontmatter, or "::" after an inline-field to trigger the autocompletion for `Select` and `Multi` fields

## Control field from links, file and plugin options
Right click on a link, a file in explorer, or opening a file's or plugin's context menu will automatically display an item per target note's frontmatter field and "inline fields" (dataview syntax)

these options are accessible from:
- the context menu of a link, 
- the context menu of a calendar day, 
- the context menu of a file in the file explorer,
- the "more options" menu of a file
- the command palette "Cmd+P" : Metadata Menu - field options
- other context menu (not tested)

### Update free value field (type: `Input`)

1. Right-click on the link (or context menu, ...)
2. Click on "Update .... " to change the field's value
3. Change the value in the modal's prompt
4. Type `enter` to save or click X or `esc` to cancel

> NB: if you have the `natural language dates` plugin installed, you can type the target date in natural langage and toggle the 📆 selector to automatically convert the input into a link towards the daily note

### Update multiple free values field (type: `Input`)

1. Right-click on the link (or context menu, ...)
2. Click on "Update .... " to change the field's value
1. Change values comma-separated
1. Press `enter`, the values will be displayed as an array of values in the target note's frontmatter field; or as a list of values comma separated in an inline field

**this doesn't work with indented lists YAML format**

### Update boolean field (type: `Boolean`)

1. Right-click on the link (or context menu, ...)
1. Click on `✅ ▷ ❌` or `❌ ▷ ✅` depending on the value of the boolean to change the value by its opposite

### Select a value for the field (type: `Select`)

1. Right-click on the link (or context menu, ...)
2. Click on "🔽 .... " to change the field's value
3. The modal will display a dropdown list with preset values
4. Change the value in the modal's dropdown
5. Click on the save button to save or click X or `esc` to cancel

### Multi select preset values for field (type: `Multi`)

1. Right-click on the link (or context menu, ...)
2. Click on "🟰 .... " to change the field's value
3. The modal will display a grid of switches for preset values
4. Change the values by toggling the switches in the modal
5. Click on the save button to save or click X or `esc` to cancel

### Cycle through preset values (type: `Cycle`)

1. Right-click on the link (or context menu, ...)
2. Click on " .. > .. " to change the field's value for the next one in the settings list

### Update a link to a file (type: `File`)

1. Right-click on the link (or context menu, ...)
2. Click on " 🔎 Update ... "
3. Type or select the link within the modal


### Update a date (type: `Date`)

1. Right-click on the link (or context menu, ...)
2. Click on " 📅 Update ... "
3. Type the date or select the date thanks to the date picker by clicking the "📅" button in the modal. If you have `Natural Language Dates` plugin installed, you can also type your date in natural language and have it parsed automatically
4. Toggle `on` the `insert as link` option if you want your date to be included as a link


### Add a new field at section

1. Right-click on the link
2. Click on "Add field at section"
3. Select the line in the target file where you want to insert the new field
4. Select the field
5. Select/input the value for this field (if the field has preset values, you will be prompted to choose one)

## Control field from dataview tables with dataviewjs

using `fieldModifier` function included in metadata-menu API (see # Api), you can build modifiable fields within dataview table

fieldModifier takes 4 arguments:
- dv: the dataview api
- p : the page your are currently iterating on
- fieldName: the name of the field you want to display (as string)
- attrs (optional): an object with the attributes you want to pass to the field:
    - cls (optional): the class to be applied to the field
    - attr (optional): the dataview attributes for the field (they will be included as data tags in the HTML rendering of the field)
    - options (optional): an object containing specific options for Metadata Menu field modification

### options

#### alwaysOn

with `options: {alwaysOn: true}` the control for the field will always be displayed

with `options: {alwaysOn: false}` (default) the control for the field won't always be displayed, you'll have to click on an intermediate button or hover the field to display the control

#### showAddField

with `options: {showAddField: true}` if the file has no corresponding field, a "+" button will be displayed to select a line in the target file where to add this field

with `options: {showAddField: false}` (default) if the file has no corresponding field, a null value will be displayed

#### inFrontmatter

with `options: {inFrontmatter: true}` the field will automatically be inserted at the end of the frontmatter of the file if exists. If there's no frontmatter (or wrongly formatted frontmatter), a modal will be displayed to select the section where to insert the field

with `options: {inFrontmatter: false}` (default) a modal will be displayed to select the section where to insert the field 

### syntax

```js
/* dataviewjs block */

const {fieldModifier: f} = this.app.plugins.plugins["metadata-menu"].api // destruct metadata-menu api to use fieldModifier function and give an alias: "f"

dv.table(["file", "Masterization", "Tune"], 
    await Promise.all( // await all modifiers to resolve their promise
        dv.pages()
        .where(p => p.fileClass === "music")
        .map(async p => [
            p.file.link, 
            await f(dv, p, "masterization", {options: {alwaysOn: true}}),  // pass dv (dataview api instance), p (the page), the field name to fieldModifier (: "f") and an object with options: {alwaysOn: true} so taht the control is always visible
            await f(dv, p, "tune") // pass dv (dataview api instance), p (the page), and the field name to fieldModifier (: "f")
            ])
    )
)
```

Controls will be added to the dataview's table depending on the type of the field.

### `Input`
when hovering the field you will get a 🖍 button

when clicking the button, an input field will replace the value. you can type a new value
- type escape or click the ❌ button : the input will be replaced by the initial value
- type enter or click the ✅ button: the initial value will be replaced by the input value in the target note and the input field will be replaced by the value

### `Boolean`
the value will be replaced by a checkbox: click on the checkbox to modify the value

### `Number`
when hovering the field you will get 3 buttons: ◀️, 🖍 and ▶️

when clicking 🖍, an input field will replace the value. you can type a new value
- type escape or click the ❌ button : the input will be replaced by the initial value
- type enter or click the ✅ button: the initial value will be replaced by the input value in the target note and the input field will be replaced by the value

when clicking on ◀️, you will decrement the value by `1` or by the value of `step` if defined

when clicking on ▶️, you will increment the value by `1` or by the value of `step` if defined

### `Cycle`
when hovering the field you will a ▶️ button

when clicking on ▶️, you will replace the value of the field by the new option defined in field options

### `Select`
Click to the arrow next to the value.

The value of the field will then be replaced by a select field. 

Select another value to change the value

### `Multi`
The values of this field are displayed as a chip component

When hovering the value, a "➕" button will be added at the end of the list.

When hovering a chip, a "❌" button will be added after the value

When clicking on "❌", the value will be removed from the list of the values in the target field.

When clicking on "➕", the values will be replaced by a select field in the table with the remaining values available (not already selected). Select the new value that you want to add: it will be added at the end of the list in the target field.

### `File`
The values of this field are displayed as a link

Click the "🔎" button next to the link to display a suggester modal.

Select a choice to replace the link in the target field.


### `Date`
The values of this field are displayed as a date string or a as link

Click the "📆" button next to the link to display a date select modal.

type a new date (or select thanks to the datepicker) to replace the link in the target field.


# FileClass 

Manage preset values based on the context of a file (fileClass)

## Define a class for a file and authorized fields for this class

a class file is basically a simple note

the name of the file will be the name of the class

the lines of the file will be the fields managed for this class

1. Define the folder where you want to store your class files (see settings above)
2. Create a note in this folder, let's say `music.md`, containing lines with the name of fields that you want to manage for this class
```md
music.md
=========
genre
difficulty
masterization
artist
tone
tab available
```
3. In a regular note, let's say `Black Dog.md`, insert a frontmatter field named `fileClass`
4. The value of `fileClass` has to be the name of the file Class where you have the fields that you want to manage for this note. e.g in our case
```yaml
---
fileClass: music
---
```
5. when right-clicking on a link to `Black Dog.md`, the fields in the context menu will be filter to show only the ones that are also included in `music.md`.

>Since there are no particular options set for each field in the `music.md` note, every field will be considered as an `Input` type.

## field settings syntax

You can specify the type of a field in a fileClass, and its options. Type and Options are called "field settings"

Type can be one of the types defined above (see ## Field Types)

Options can be an array of options, or an object <key, value>

> NB 1: Arrays will be converted in Objects <key, value> after the first modification of the field through `Manage <fileClass> Fields` action in context menu (see below)


> NB 2: "input" type attributes dont need a setting, leaving the name of the attribute only will categorize this attribute automatically as an "input" type.


A field settings is written in JSON and must be written as a value of and "inline (dataview) field"

### example

Say you want to set fields in `music.md` fileClass :
- `genre` is a `Multi` field with "rock", "pop" and "jazz" as options,
- `difficulty` is a `Number` within [0, 100] that you want to decrement/increment by 5
- `masterization`is a `Cycle` field with [⭐️, ⭐️⭐️, ⭐️⭐️⭐️, ⭐️⭐️⭐️⭐️, ⭐️⭐️⭐️⭐️⭐️] values
- `tone` is a `Select` field with [A, B, C, D, E, F, G] values
- `artist` is an `Input` field
- `tab available` is a `Boolean` field

here is how the fileClass `music` file should be written

```md
music.md
=========
genre:: {"type":"Multi", "options":["rock", "pop", "jazz"]}
difficulty:: {"type": "Number", "options": {"step": "5", "min": "0", "max": "100"}}
masterization:: {"type":"Cycle", "options":["⭐️", "⭐️⭐️", "⭐️⭐️⭐️", "⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️⭐️⭐️"]}
tone:: {"type":"Select", "options":["A", "B", "C", "D", "E", "F", "G"]}
artist
tab available:: {"type": "Boolean"}
```

this `music` fileClass could also be written

```md
music.md
=========
genre:: {"type":"Multi", "options":{"0":"rock", "1":"pop", "2": "jazz"}
difficulty:: {"type": "Number", "options": {"step": "5", "min": "0", "max": "100"}}
masterization:: {"type":"Cycle", "options":{"0": "⭐️", "1": "⭐️⭐️", "2": "⭐️⭐️⭐️", "3": "⭐️⭐️⭐️⭐️", "4": "⭐️⭐️⭐️⭐️⭐️"}}
tone:: {"type":"Select", "options":{"0": "A", "1": "B", "2": "C", "3": "D", "4": "E", "5": "F", "6": "G"}}
artist:: {"type": "Input"}
tab available:: {"type": "Boolean"}
```

## fileClass settings forms
Because it can be overwhelming to remember this syntax, you can manage "type" and "options" for each fields from:
- the context menu of a note that has this fileClass as a frontmatter's fileClass attribute : click on [`⚙️ Manage <music> fields`] for `music.md` from any file with `fileClass: music` set in frontmatter
- the more-options menu of a fileClass file
- a command within a fileClass file (`alt+P`) -> `Metadata Menu: fileClass attributes options`

You will be asked to choose the field that you want to modify or if you want to add a new one. After having selected a field, you will acces to a form to modify the type and options of the field (same form as in the plugin's settings)

## fileClass inheritance

### `extends` field

a fileClass can extend another fileClass to benefit of it's fields without having to rewrite them.

It may be usefull if you have several fileClass with the same set of fields.

For example you may have a fileClass named `course.md` with some fields like `teacher`, `lecture`, `grade`, `type`.

And you may want to define more specific fields depending on the type of course: a first fileClass `mathematics.md` with a field `chapter:: {"type": "Select", "options": {"0": "Algebra", "1": "Geometry", "2": "Statistics"}}` and a second fileClass `physics.md` with a field `lecture:: {"type": "Select", "options": {"0": "Mecanics", "1": "Optics", "2": "Electricity"}}`. For the two of them, you want to benefit from the `course` fileClass's fields.

You can do this very easily by using the `extends` field in their frontmatter.

With our example:

`course.md`

```
teacher::{"type": "Input"}
grade::{"type": "Select", "options":{"0": "A", "1": "B", "2": "C"}}
type::{"type": "Select", "options":{"0": "at school", "1": "online", "2": "personal teacher at home"}}
```

`mathematics.md`

```
---
extends: course
---
chapter::{"type": "Select", "options": {"0": "Algebra", "1": "Geometry", "2": "Statistics"}}
to do next::{"type": "File", "options": {"dvQueryString": "dv.pages('\"Courses\"')"}}
```

`physics.md`

```
---
extends: course
---
lecture:: {"type": "Select", "options": {"0": "Mecanics", "1": "Optics", "2": "Electricity"}}
```

All notes with fileClass `mathematics` or `physics` will benefit from the fields of `course` with the same option, but they will have their own fields in addition to it (`chapter` for `mathematics`, `lecture` for `physics`)

A fileClass can also override a field it has inherited from by defining it again.

for example:

`physics.md`

```
---
extends: course
---
lecture:: {"type": "Select", "options": {"0": "Mecanics", "1": "Optics", "2": "Electricity"}}
type::{"type": "Select", "options":{"0": "at school", "1": "online"}}
```

the `type` field in `physics` will override the one in `course`. notes with `fileClass: physics` will have `at school` and `online` options for `type` but not `personal teacher at home`


### `excludes` field

when defined with an array of values, the field in the array won't be inherited from the parent fileClass

With our previous example:

`physics.md`

```
---
extends: course
excludes: [grade]
---
lecture:: {"type": "Select", "options": {"0": "Mecanics", "1": "Optics", "2": "Electricity"}}
```

notes with `fileClass: physics` will inherit `teacher` and `type` from `course` fileClass but not `grade`

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
This is async and should be awaited

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

# Roadmap
- [ ] manage indented lists multi-values frontmatter field

# Know Issue
- autocomplete conflicts with Various Complements plugin