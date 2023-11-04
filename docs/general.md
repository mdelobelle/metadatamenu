# General Concepts

Metadata Menu can manage any metadata field located in frontmatter (YAML syntax) or in the body of the note with the syntax `field::` (dataview style, dataview plugin is required)

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
- `Formula`: a field that will `Make Calculation based on note's fields`
- `Canvas`: a field that will `Update with links in a canvas`
- `Canvas Group`: a field that will `Update with groups in a canvas`
- `Canvas Group Link`: a field that will `Update with groups links in a canvas`
- `JSON`: a field that will `Accept a JSON object`
- `YAML`: a field that will `Accept a YAML object`
- `Object`: a field that will `Accept a collection of fields`
- `Object List`: a field that will `Accept a list of collection of fields`

!!! warning "Restrictions"
    `YAML`, `Object` and `Object list` field types are only available in the frontmatter section


## Field settings

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