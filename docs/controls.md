# Controls

With Metadata Menu, you have several options to control a field:
- [Autocompletion](#control-field-with-autocompletion)
- [Context Menu and command palette](#context-menu-and-command-palette)
- Metadata menu button opening the [note's fields modal](#open-fields-modal)
- [Api](api.md)

## Control field with autocompletion
In Editor mode, type ":" after a field in frontmatter, or "::" after an inline-field to trigger the autocompletion for `Select`, `Multi`, `File` and `Multi File` fields

## Context Menu and Command palette
Right click in the live preview, on a link, a file in explorer, or opening a file's or plugin's context menu will display options to manage the note's fields

these options are accessible from:

- the local menu in the live preview (right-click in the note)
- the context menu of a link, 
- the context menu of a calendar day, 
- the context menu of a file in the file explorer,
- the menu of a file
- the command palette "Cmd+P" : Metadata Menu - field options or insert field at cursor or manage field at cursor
- other context menu (not tested)

### Open fields modal

Will open a modal to manage the fields and fileclasses of this note with a compact UI

### Manage Fields

Will open a native Obsidian suggest modal with options available to modify a field or execute the actions mentionned hereafter

### Add a new field at section

1. Right-click on the link
2. Click on "Add field at section"
3. Select the line in the target file where you want to insert the new field
4. Select the field
5. Use the field's modal to manage the value

NB: if the field type is restricted to the frontmatter section, it will be added at the end of the frontmatter whatever the line chosen

### Add a new field at cursor

In live preview, you can add a field at cursor without having to choose the section

### Insert all missing fields

When fileClasses are defined for a note, you can bulk insert all fields defined in those fileClasses that aren't yet included in the note

You can also insert missing fields on a fileClass per fileClass mode : this option is also available in fileClass sub-menu, or next to fileClasses in the Metadata Menu modal (see [Metadata Menu button](#metadata-menu-button--metadata-menu-modal))

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
        dv.pages()
        .where(p => p.fileClass === "music")
        .map(p => [
            p.file.link, 
            f(dv, p, "masterization", {options: {alwaysOn: true}}),  // pass dv (dataview api instance), p (the page), the field name to fieldModifier (: "f") and an object with options: {alwaysOn: true} so taht the control is always visible
            f(dv, p, "tune") // pass dv (dataview api instance), p (the page), and the field name to fieldModifier (: "f")
            ])
    )
)
```

Controls will be added to the dataview's table depending on the type of the field.

## Globally update lookup fields

Lookup fields automatically update themselves unless you untoggle their "Auto-update" option

If you want to force-update this lookup field you can use the command palette command `Metadata Menu: Update lookup fields`

## Metadata Menu button & Metadata Menu modal

if one or more fileClass / Supercharged tag is defined for a note, you can display a button next to the note reference everywhere in your vault.
When clicking this button, a modal will display all fields defined for those fileClasses and their values.

From there you can
- update a field
- insert a field
- change the setting of the field in its fileClass
- see which field corresponds to which fileClass and the opposite
- bulk insert missing fields (for all fileClasses, or or one fileClass in particular)

The icon of the button can be customized in the fileClass with the higher priority (see [icon](/fileclasses/#iconfield) )

The visibility of the button can be managed in the plugin [settings](settings.md#show-extra-button-to-access-metadata-menu-form)