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

#### `Select the source of values for this field`

You have to choose the source of values for your select field between 4 sources:

- `Values defined in these setting` : enter the [`Preset Options`](#preset-options) one by one, sort them
- `Values from a note` : enter the [`Path of the note containing the values`](#path-of-the-note-containing-the-values)
- `Values returned from a dataview query` : create a [`dataview function`](#dataview-function) to return a list of values

#### `Path of the note containing the values`
You can define the list of values in a note. This note must contain a value per line. You have to type the full path to the note in the `Path of the note containing the values` field (don't forget the .md extension)

#### `Preset options`
you can add preset values (options) directly in the setting form by clicking the `Add` button in the `Preset Options` section.
You can rearrange the order of the options.

This order is used to display the values in the dropdown lists and is the order used to cycle through values.

> If both `Path of the note containing the values` and `preset options`, the first one will have the priority.

#### `Dataview function`

Dataview query returning a list of string. The dataview api can be accessed with the `dv` variable, and the current page (dv.page object) is available with the `current` variable

example: 
`dv.pages('#student').map(p => p.name)`

#### `Cycle begins by a null value`
When set to true, the value of the field will be set to null if increasing one step after the last value of the list

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

### `Date` options

#### `Date Format`
The output format of the date as string following moment.js's syntax for formatting tokens : https://momentjs.com/docs/#/displaying/format/

#### `Link path`
If you want to render your date as a link to a note, specify the path of the folder where the note should be.

#### `Insert as link by default`
Toggle `on` if you want the option to insert the date as a link to be selected by default when creating/modifying a date field.

#### `Shift Interval`
The time duration used to shift the date in the future. You can use several durations:

- `year`
- `month`
- `week`
- `day`
- `hour`
- `minute`
- `second`

and even a combination of them

Example of shift intervals: `2 days`, `1 week 3 days`, ...

#### `Shift Intervals field`
You can define intervals in a cycle field, for example for increasing intervals used in spaced repetition. Put the name of this cycle field in the `Shift Interval field` setting, and those intervals will be used to shift the date in the future.


### `Lookup` options

A lookup field will look for targetted fields (aka related field) in targetted notes (aka Dataview JS Query results) and display the result in a presistent manner. Unlike a dataview view, a lookup field will change the content of the file by updating the value of the lookup field. 
So even if you disable dataview plugin, the lookup field will still contain the value. 
Lookup fields can therefore be "published".

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

### `Canvas` options
A canvas field of a given note is automatically updated with other notes connected to it in a specific canvas.

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

### `Canvas Group` options
A canvas group field of a given note is automatically updated with names of matching groups their nodes belong to in a specific canvas.

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

### `Canvas Group Link` options
Combination of the `Canvas` and the `Canvas Group` field options. This time, the field will target nodes linked to the groups the node belongs to

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

### Show extra button to access metadata menu form

When a note has one or more fileClass (or [supercharged tags](/fileClasses/#mapwithtag-field--supercharged-tag)) you can display a button next to the note's : 
- links in reading mode
- links in live preview
- file in file explorer
- reference in star panel
- reference in search panel
- reference in backlinks panel
- tab header

each option has its own toggler

## Migrate
Historically most of this plugin's features were available in `Supercharged links` plugin.

In order to better scale, those features have been removed from `Supercharged links`. By clicking the `Copy` button, you can import the settings from `Supercharged links` to avoid setting everything again from the ground up.

> Warning: this will replace your whole settings, so be cautious not to override your work.
