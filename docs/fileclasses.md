# FileClass 

Manage preset values based on the context of a file (fileClass)

!!! info "Dependency"

    Dataview plugin required
    

## Define a class for a file and authorized fields for this class

a class file is basically a simple note

the name of the file will be the name of the class

the lines of the file will be the fields managed for this class

1. Define the folder where you want to store your class files (see settings above)
2. Create a note in this folder, let's say `music.md`, containing lines with the name of fields, their type and options (see [settings](#field-settings-syntax)) that you want to manage for this class
```md
music.md
=========
genre:: {"type": "Input", "options": {"0": "rock", "1": "pop"}}
difficulty::{"type": "Number" ....
...
```
3. In a regular note, let's say `Black Dog.md`, insert a frontmatter field named `fileClass`
4. The value of `fileClass` has to be the name of the file Class where you have the fields that you want to manage for this note. e.g in our case
```yaml
---
fileClass: music
---
```
5. when right-clicking on a link to `Black Dog.md`, the fields in the context menu will be filter to show only the ones that are also included in `music.md`.

### Nested fileClasses

You can sort your fileClasses in sub-folders. Then if you want to use them in a note, just type their sub-path `fileClass: <sub-folder>/<sub-sub-folder>/<fileClass name>`

## field settings syntax

You can specify the type of a field in a fileClass, and its options. Type and Options are called "field settings"

Type can be one of the types defined above (see ## Field Types)

Options can be an array of options, or an object <key, value>

> NB 1: Arrays will be converted in Objects <key, value> after the first modification of the field through `Manage <fileClass> Fields` action in context menu (see below)


> NB 2: "input" type attributes dont need a setting, leaving the name of the attribute only will categorize this attribute automatically as an "input" type.


A field settings is written in JSON (using double-quote only `"` )and must be written as a value of and "inline (dataview) field"

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

You will be asked to choose the field that you want to modify or if you want to add a new one. After having selected a field, you will acces to a form to modify the type and options of the field (same form as in the plugin's [settings](settings.md#preset-field-settings))

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

### `mapWithTag` field : Supercharged Tag

when this is set to `true` all notes including a tag with the same name will benefit from the fields' definitions of this fileclass

you can also map a fileclass with his tag from the context menu of the fileclass

This works with nested tags as well

### `tagNames`field: aliases for your fileClasses

when not empty (string or array of string), the tags will be mapped with this fileClass

### `icon`field

you can customize the icon of the metadata button that gives access to a modal containing all available fields for a note bound with this fileclass

the icon names are available from https://lucide.dev