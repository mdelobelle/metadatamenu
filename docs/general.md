# General Concepts

Metadata Menu can manage any metadata field located in frontmatter (YAML syntax) or in the body of the note with the syntax `field::` (dataview style, dataview plugin is required) for which a definition (type & options) is set.

## Field Types
Available types are:

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

!!! warning "Limitations"
    `YAML`, `Object` and `Object list` field types are only available in the frontmatter section


## Field definition

You can define a `field setting` for each field.

A field setting is composed of:

- a name
- a type (see [Field Types](#field-types) list above)
- options depending on the type

A field setting can defined in:

- Metadata Menu settings (see # Metadata Menu Settings)
- in a fileClass note (see # Fileclass)

!!! info "Priority management"

    NB: if a field has a setting defined in the Metadata Menu settings AND in a fileClass note, the setting of the fileClass will take the priority over the setting defined in Metadata Menu settings

See detailed section [settings](settings.md)

## Controls
a Field can be modified or added from several locations:

- autocompletion within the editor mode
- Obsidian and plugins menus : file explorer, note, calendar, context menu of a link, many other plugins not fully tested ...
- dataview table if you have dataview plugin installed
- the [Metadata Menu button](#metadata-menu-button--metadata-menu-modal) appearing next to each note's name (file explorer, tab header, link....)

See detailed section [controls](controls.md)