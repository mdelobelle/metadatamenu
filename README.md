# Metadata Menu
This plugin is made for data quality enthusiasts: access and manage the metadata of your notes in Obsidian.

Metadata Menu adds context menu items to modifiy target note's frontmatter fields and "inline fields" (dataview syntax) by right-clicking on the link, or within dataview tables

You can define preset types and values for those fields globally in the plugin's settings or on a file-by-file basis thanks to fileClass definition

It also enables frontmatter of inline-field autocompletion with suggested values based on preset values.

For complete documentation : https://mdelobelle.github.io/metadatamenu

[demo 1](https://youtu.be/7bvIAkJf0OE) : basic features, settings and field types

[demo 2](https://youtu.be/gU-StGyDciY ): autocompletion and "in sentence" fields commands

[demo 3](https://youtu.be/sYudigxPEnY): File type fields

[demo 4](https://youtu.be/PrbYaVh7N7g): Date type fields

[demo 5](https://youtu.be/Mq2tbA0RVM8): Templates for Input type fields:

[demo 6](https://youtu.be/QxXSuh7HUZY): FileClass

[demo 7](https://youtu.be/6dEk9no269g): Time shifting for spaced repetition or date postponing

[demo 8](https://youtu.be/ad0nJf8TZP8): Lookup fields

[demo 9](https://youtu.be/zUcZWG7nWF4): Lookup fields as bullet list

[demo 10](https://youtu.be/vc55ivQuHuY): Better Select and File fields

[demo 11](https://youtu.be/I73uW8fqOZ8): Supercharged Tags, multi fileClasses and metadata button

[demo 12](https://youtu.be/3jukvV7OODg): Fileclass View

[demo 13](https://youtu.be/7oaau8ijVUA): Canvas fields

[demo 14](https://youtu.be/G47AYkmoKJs): Create a Kanban board with Canvas Group fields

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
- `MultiFile`: a field that will `Accept multiple links`
- `Date`: a field that will `Accept a date`
- `Lookup`: a field that will `Accept a lookup query`
- `Canvas`: a field that will `Update with links in a canvas`
- `Canvas Group`: a field that will `Update with groups in a canvas`
- `Canvas Group Link`: a field that will `Update with groups links in a canvas`

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

# Roadmap
- [ ] manage indented lists multi-values frontmatter field

# Know Issue
- autocomplete conflicts with Various Complements plugin