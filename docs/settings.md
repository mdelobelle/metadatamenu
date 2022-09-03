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

Every item enclosed in curly braces will be transformed into an input or a dropdown select in the field modal. You can modify the "templatized" text afterwards.

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

### `File`, `MultiFile` options
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
