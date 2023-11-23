# FileClass 

Manage preset values based on the context of a file (fileClass)


## What is a fileClass

A fileClass is basically a simple file located in the folder defined in the [plugin's settings](settings.md#fileclass-files-folder)

The name of the file will be the name of the class. 

To map a file of your vault with a fileClass you have [several options](fileclasses.md#file-mapping)

You can sort your fileClasses in sub-folders. Then if you want to use them in a note, just type their sub-path in the frontmatter of the note: `fileClass: <sub-folder>/<sub-sub-folder>/<fileClass name>`

the frontmatter section of this file contains the [Fileclass settings](fileclasses.md#fileclass-settings) and [fields definition]() for this fileClass. The body of this file is not used by the plugin, you can write anything you want in there.

## setup
1. Define the folder where you want to store your class files in the [plugin's settings](settings.md#fileclass-files-folder)
2. Create a note in this folder, let's say `music.md`
3. A button will appear in the tab header of this note. click on it to access the "fileClass view" composed of 3 tabs
    - A table view listing all files that inherit this fileClass
    - A Fileclass Fields views where you can add/change/remove fields definitions for this fileclass
    - A [Fileclass Settings](fileclasses.md#fileclass-settings) view where you can change the settings of the fileclass

## File mapping

You have several options to map a file with a fileClass. Those options can be combined to associate multiple fileclasses to a given file. In case 2 fileclasses mapped with the same file have fields with the same name, the field will be mapped according to this priority order:
1. fileClass value in the [frontmatter](fileclasses.md#basic-mapping)
2. [Tag](fileclasses.md#map-with-tag) match
3. [Path](fileclasses.md#files-paths-option) match
4. [Bookmark group](fileclasses.md#bookmark-group-option) match
5. [fileClassQuery](fileclasses.md#map-with-a-query) match
6. [Global fileClass](fileclasses.md#global-fileclass-mapping)
7. settings [preset fields](settings.md#preset-field-settings)

### Basic mapping

include the name of the fileclass in the frontmatter of a note:

```
Bob Dylan.md
===============================
---
fileClass: music
---

some cool stuff about Bob Dylan
```

`Bob Dylan.md` will be mapped with the fileClass `music`

you can set multiple fileClass for a file:

```
Obsidian.md
==============================
---
fileClass:
  - company 
  - pkm
---

some cool stuff about Obsidian
```

### Map with tag

Include a tag that matches the fileclass and set [mapWithTag](fileclasses.md#map-with-tag) as true:

```
Bob Dylan.md
===============================
#music

some cool stuff about Bob Dylan
```
`Bob Dylan.md` will be mapped with the fileClass `music`

Or choose any other tag defined in the [tag names](fileclasses.md#tagnames-option)

### Map with folder's path

Put your file in a folder that matches one the options defined in [Files paths option](fileclasses.md#files-paths-option)

For example if "Resources/Music" is defined in [Files paths option](fileclasses.md#files-paths-option), and if Bob Dylan.md is in `<Your Vault>/Resources/Music/` then it will be mapped with the fileClass `music`


### Map with bookmark groups

Bookmark your file with a bookmark group that matches one the options defined in [Bookmark groups options](fileclasses.md#bookmark-group-option)


### Map with a query

Set a [Fileclass query](settings.md#fileclass-queries) in the plugin settings and all files included in this query's result will be mapped with the related fileclass


### Global fileclass mapping

If the file isn't mapped with a fileclass thanks to the previous options, and if there is a [Global Fileclass](settings.md#global-fileclass) defined, then the file will be mapped with this global fileclass

## FileClass Settings

All fileclass settings are easily configurable in a dedicated view named `Fileclass Setting`. This view is accessible by clicking the button next to the fileclass name (in the file explorer, in the tab header of the fileclass file, next to the internal link to this file etc...).

### `extends` field

a fileClass can extend another fileClass to benefit of it's fields without having to rewrite them.

It may be usefull if you have several fileClass with the same set of fields.

For example you may have a fileClass named `course.md` with some fields like `teacher`, `lecture`, `grade`, `type`.

And you may want to define more specific fields depending on the type of course: a first fileClass `mathematics.md` with a field `chapter` and a second fileClass `physics.md` with a field `lecture`. For the two of them, you want to benefit from the `course` fileClass's fields.

You can do this very easily by using the `extends` field in their frontmatter.

With our example:

`course.md`

```
---
fields:
  - name: teacher
    type: Input
    id: ....
    ...
  - name: grade
    type: Select
    options: 
      - "0": "A"
      - "1": "B"
      - "2": "C"
    id: ...
  - name: type
    type: Select
    options:
      - "0": "at school"
      - "1": "online"
      - "2": "personal teacher at home"
    id: ...
  
---

```

`mathematics.md`

```
---
extends: course
fields:
  - name: chapter
    type: Select
    options:
      - "0": Algebra
      - "1": Geometry
      - "2": Statistics
    id: ...
  - name: to do next
    type: File
    options:
      dvQueryString: "dv.pages('\"Courses\"')"
    id: ...
---
```

`physics.md`

```
---
....
extends: course
- fields:
  - name: lecture
    type: Select
    options:
      - "0": Mecanics
      - "1": Optics
      - "2": Electricity
    id: ...
---
```

All notes with fileClass `mathematics` or `physics` will benefit from the fields of `course` with the same option, but they will have their own fields in addition to it (`chapter` for `mathematics`, `lecture` for `physics`)

A fileClass can also override a field it has inherited from by defining it again.

for example:

`physics.md`

```
---
extends: course
- fields:
  - name: lecture
    type: Select
    options:
      - "0": Mecanics
      - "1": Optics
      - "2": Electricity
    id: ...
  - name: type
    type: Select
    options:
      - "0": "at school"
      - "1": "online"
    id: ...

---
```

the `type` field in `physics` will override the one in `course`. notes with `fileClass: physics` will have `at school` and `online` options for `type` but not `personal teacher at home`


### `excludes` option

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

### `mapWithTag` option
*Supercharged Tag*

when this is set to `true` all notes including a tag with the same name will benefit from the fields' definitions of this fileclass

This works with nested tags as well

### `tagNames` option
*aliases for your fileClasses*

when not empty (string or array of string), the tags will be mapped with this fileClass


### `Files Paths` option
*map path with your fileClasses*

when not empty (string or array of string), the file with those paths will be mapped with this fileClass


### `Bookmark group` option 
*map bookmark with your fileClasses*

when not empty (string or array of string), the files bookmarked with those bookmark groups will be mapped with this fileClass

### `button icon` option

you can customize the icon of the metadata button that gives access to a modal containing all available fields for a note bound with this fileclass

the icon names are available from https://lucide.dev

### `max records per page` attribute

number of rows per page in the [fileclass's table view](fileclasses.md#table-view). 

### `version` attribute

Managed by the system

## Fileclass Fields

In this view, as in the [preset fields](settings.md#preset-field-settings) settings, you can add, edit and remove [fields definition](fields.md) for this fileclass:
- "list plus" button to add a new field
- "pencil" button to edit a field's definition
- "trash" button to remove a field

## Table view
This view shows all files mapped with the fileclass. you can modify the fields directly from the table.

- "saved view" dropdown select to select a saved view
- "star" button to set or revoke the current view as the favorite view
- "eraser" button to reset the filters and sorting
- "save" button to save the current view
- "trash" button to delete the current view from the saved views
- "collapse filter" button to access more options: sort the table, filter the results, re-arrange columns orders, hide/show columns...
