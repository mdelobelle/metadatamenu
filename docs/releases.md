//TODO: Complete

# 0.6.0
Metadata Menu 0.6.0 public beta is out 👨‍🔬

_an attempt to manage nested properties_

🧰 **New field types**
- JSON: edit the value with a JSON editor
- Yaml: edit the value with a Yaml editor
- Object: nest fields in the frontmatter (aka **nested properties** 🥳)
- Object List: list of nested fields-sets in the frontmatter

Combining Object, Object List with other types you can infinitely nest your fields int the frontmatter and virtually fully "type" your yaml properties

💈 **Commands**

Improved UI for managing the fields now fully manageable with keyboard and hotkeys.

Modal Navigation in nested fields

Metadata menu button now appears in the property section

Metadata menu fields commands are added to the property section

🗺️ **Fileclass improvements**

Now you can map fileclasses with folders, bookmark groups

You can exclude folders, file name patterns and file extensions from being mapped with fileclasses and from being indexed by the plugin (to improve performance)

The fileclass tableview now displays every file mapped with a fileclass (through the fileclass prop, but also mapped with tags, bookmarks, fileclass queries, folders....)



Fileclass fields button specific icons

🚂 **engine**

New indexing engine. May be slower to index at plugin's launch but faster afterwards

Metadata Menu index status in the status bar. This status will also inform about formulas or lookups whose values have changed and that should be manually updated.

🧹**deprecated functions**
- api : insertValues
- api : replaceValues

# 0.5.2
🔑 Metadata Menu 0.5.2
Should work as expected along with Properties core plugin

Improvement
🎨  Ability to Format the field name when inserting as an inline field (dataview)

Fix
🔧 Metadata menu form, set/update not longer displays duplicates
🔧 Fixed input field for null value with number field, now interpreted as 0 so as to enable increment and decrement more easily.

# 0.5.0
I've released Metadata menu 0.5.0 
It should work fine with obsidian 1.4.0

# 0.4.18
☃️ Metadata Menu 0.4.18 comes with lots of improvements

📱 The note's field modal and the fileClass view display has been improved for mobile screens
🔥 Support for advanced suggestions for file fields (thanks a lot @Krakor ). Read the documentation for more details https://mdelobelle.github.io/metadatamenu/settings/#dataview-query
🤕 Fixes for frontmatter autocomplete: single Select Field are no longer displayed as indented list
📆 Date display in the note's fields modal has been fixed for dates displayed as text

# 0.4.11
🚑 Metadata Menu 0.4.11 Is out with some improvements

🩹 Auto suggester in frontmatter has been revamped
🧹 Empty fields in frontmatter are displayed as blank instead of "null"
💊 You can choose to display your values as arrays or indented lists in frontmatter globally or per field
✏️ You can toggle on/off auto suggester globally in the plugin settings

# 0.4.6
🌝Metadata Menu 0.4.6 : Canvas Group Links fields

🔗 Canvas Group Link fields combine Canvas field and Canvas Group field: They will be updated with the links to node's files that are linked to matching groups (instead of group names given by Canvas Group fields).
Use case: Use file nodes as kind of tagging for groups (see the picture for more clarity)
Documentation here: https://mdelobelle.github.io/metadatamenu/settings/#canvas-group-link-options

🤿 Subpath for Canvas fields: when a file node is narrowed to a header, the link returned in the canvas field contains the full path#sub-path

🐭 Input, Date and Number field modal improvement: type Enter will validate the field (faster than clicking the check button)

# 0.4.5
🎉Happy new year everyone. 
Metadata Menu 0.4.5 brings a bunch of fixes for bugs that appeared with version 0.4.0 (due to new way of managing frontmatter).
No longer broken:

    Mobile version of the plugin is no longer broken
    Indented lists in frontmatter (no more empty values, no more cursor returning at the beginning of the line after selecting an autosuggested value)

Improvements:

    an extra space is added after inline fields separator :: when selecting a value from a modal
    a notice will popup at the plugin launch if the dataview plugin isn’t installed and enabled.


Some unexpected behavior with autosuggest in frontmatter may still appear. Don’t hesitate to file an issue in github: we’ll find ´em all

# 0.4.1
🪩 Metadata Menu 0.4.1 has been released. It brings more capabilities and more fun with metadata and canvas combination.

📥 Introducing Canvas Group fields : Update your metadata based on groups in canvas, those fields will get updated with the names of groups matching specific conditions (color, label) their nodes belong to. See it in action in this tutorial to create a simple Kanban canvas: https://youtu.be/G47AYkmoKJs 

# 0.4.0
🎄 Metadata Menu 0.4.0 is out

✨ Introducing Canvas fields : Bind your metadata with canvas nodes and edges, those fields will get updated with the file links matching nodes' and edges' conditions (color, side, direction, and more). demo here: https://youtu.be/7oaau8ijVUA, documentation here: https://mdelobelle.github.io/metadatamenu/settings

🎅🏻 updating fields in frontmatter is now compliant with obsidian core standard: multiple values will be displayed as indented lists in yaml syntax.

🎁 Links in frontmatter are surrounded with double quotes: ready for dataview and frontmatter links

🪓 replaceValues and insertValues api methods are deprecated and will be removed in the next version. They are replaced by postValues that will create or update values

🛷 many changes under the hood to improve speed for fields indexing. As usual, some bugs may have not been identified, don't hesitate to open issues in github 

# 0.3.7
Metadata Menu 0.3.7 has been released 🧚🏻

🦁 The Fileclass View has been improved. You have now 3 tabs:

    A table view listing all notes with this fileClass or supercharged tag where you can now paginate the table, sort it, filter it.
    A field view listing all the fileClass fields where you can change their settings, remove or add a field
    A settings view where you can preset the records per page for the table view, the icon for the metadatamenu button for this fileClass, map it with tags and set tag aliases, set a parent fileClass and exclude fields

demo here: https://youtu.be/3jukvV7OODg
🐘 You can now click on the link in the fileClass table view, it will open the note in a new tab
🦅 Manage field at cursor now automatically toggles boolean fields and move cycle fields forwards
🦓 Bug fixes: MultiSelect display in dataview table with some links in it. FileClass table view not showing note with more than one fileClass

# 0.3.6
Metadata Menu 0.3.6 🪐
🔭 fileClass and supercharged Tags table view: Display a dataview table of all notes with a given fileClass or supercharged tag, and gives the capability to modify them directly from the table. This is accessible from command palette "Open fileClass view" (you can set hotkey for it), or from the context menu of a file (in the sub menu of a fileClass)

🎭 Aliases for supercharged tags: you can bind a fileClass with any tag you want by setting tagNames: [tag1, tag2, ...] in the frontmatter of the fileClass. If there's no tagNames, the fileClass will be mapped with the tag of the same name (thanks @MMoMM.org for the idea)

🎹 Command palette to insert a specific field in the note (therefore you can set a hotkey to insert your favorite fields) (thanks @Miro_Kee  for the idea)

🎨 Complete refactoring of the styling to better match the native UI of obsidian.
🛠 Fixed date field with linkPath equal to the root folder (thanks davidbench for the PR)
🛠 Fixed broken links in docs (thanks @bri (they/m) )
🛠 Fixed insertValue api method bug when the note has no frontmatter
🧹 Code cleaning. in case something is broken, don't hesitate to open an issue on github


# 0.3.4
🎃 Metadata Menu 0.3.4 is out
🧙🏻‍♂️ Command and API method to bulk insert missing fields in a note (fields defined for fileClasses / supercharged tags associated to this note). doc here https://mdelobelle.github.io/metadatamenu/api/#insertmissingfields
👻 Formula field : make automatic calculation based on your note's fields. demo here: https://youtu.be/LqglkrzLAoQ
🕷 Performance improvement: lookup field are way more efficient now. You can even set them to not-auto-update (freeze the results and update them on-demand)

# 0.3.3
☀️ Metadata Menu 0.3.3
Thanks a lot for all your nice feedbacks about v0.3.0 and your ideas to improve supercharged tags.
In v0.3.3 you will find:

    🪺 Support for nested fileClasses and supercharged tags
    📚 Bulk insert fields in a note from the context menu or the metadata menu button : insert fields available from all fileClasses / supercharged tags defined, or on a fileclass-per-fileclass mode
    🔧 Some field indexing performance improvement for large vaults (WIP)

# 0.3.0
☄️Metadata Menu 0.3.0

💪🏻 Note Supercharged tags: Bind tags with fileClass definition. When you put a supercharged tag anywhere in a note, all fields defined in its fileClass definition are available for this note.
🐣 Create a supercharged tag: from existing or not yet exisiting tags
🐶🦁🚗🗺️ Add multiple fileClass and supertags per note: combine fileClass, supercharged tags and fileclass queries to finegrain which metadata fields are available for your note.There's a priority management If the same field is defined in serveral fileclasses.
📋New Note's metadata fields form: access all available metadata fields for your note in a single form where you can easily:

    insert  a field
    update a field
    see which fileclass/supertag the field belongs to
    change the field settings
    add a new field definition to one of the supercharged tag/fileclass of this note (it will therefore be available for other notes sharing the same supercharged tags and fileclasses)


✨ new Note's metadata button will be added right next to the note's link/tab header/... to access the note's metadata form without opening the note or navigating in the context menu. 
👨🏻‍🎨 The Note's metadata button icon can be customized in the fileClass definition (from lucide.dev icons set). You can customize where these buttons are displayed or hidden in the settings. 
🤝When used in combination with the Supercharged links plugin, you get a great understanding of what a note is about and great ease to manipulate its metadata from anywhere in your vault.
📌Better UX for section choice  for "add a field at section" command.
🔧Lots of under-the-hood optimization, so if anything doesn’t work as expected, don't hesitate to open an issue in github.

# 0.2.11
Metadata Menu 0.2.11 is available:

📶 File and MultiFile fields suggester modals are now sorted alphabetically and you can customize the sorting order (by creation time, reverse order, ...)

# 0.2.9
🪅 Metadata Menu 0.2.9 with many QOL improvements 🏖

Improve your File and MultiFile fields with aliases 🎭 
Improve your Select and MultiSelect fields with a note of values 📝 
Add missing values to settings from the field modal 😬 
Create a custom values list with a dataview query 🤓 

⚙️ lots of "under the hood" improvements.
Don't hesitate to create an issue on github in case of weird behavior

# 0.2.7
✨ Metadata Menu 0.2.7

🔎 Display lookup fields as bullet list below the field.
As a reminder: the lookup field is automatically updated when one of the target note is modified, just like a dataview view, but as genuine markdown.
This may be useful to automatize your Maps Of Content (MOC) for example

# 0.2.0
🎊 Metadata Menu 0.2.0 is live with new exciting stuff

🔎 Lookup fields: they are like Dataview inline expressions (flexible and automatically updated) but persistent. The new calculated value is replaced in your note and therefore is just regular text. Check the documentation (https://mdelobelle.github.io/metadatamenu/settings/#lookup-options)
https://youtu.be/ad0nJf8TZP8

🖱Select fields: you can now add new values to the settings for your Select fields (and multi select) directly from the modal when typing a value that is not yet in the suggestions. The focus as also been improved: you can 100% use Select fields with your keyboard now!

⚙️ core engine: the plugin has been improved so as to be fully synchronous thanks to an internal index. Even if it's been tested, there may be some edge cases that I didn't catch, don't hesitate to open a bug in Github. As a result, fieldModifier for Dataview tables are easier to write (they no longer require Promise, async, await instructions). See the documentation

# 0.1.34
Metadata Menu 0.1.34 🐣
⌚ introducing timeshifting: you can now set shift intervals to push Date fields in the future. 
This may be useful for spaced repetition in your knowledge management workflow or to postpone dates in your project management workflow

# 0.1.31
Metadata Menu 0.1.31 🎯
New command: Manage fields at cursor. 
This command is accessible from right-click or from command palette (you can assign a hotkey). Updating fields within a note gets faster and your notes get a little bit closer to forms!

# 0.1.28
Metadata Menu 0.1.28 😎
* 🗂 MultiFile field type is now available: select multiple files from your vault (optionally matching a dataview query)
* 📌Native suggest modal for multiple values selection (for MultiFile and MultiSelect types)

# 0.1.27
Metadata Menu 0.1.27:
Manage metadata inside callouts

# 0.1.22
Hi! Metadata Menu 0.1.22 is live 🎉
Access your metadata by "right-clicking" in live preview. 
Field options are also sorted in a sub menu: your context menus are therefore much shorter and better organized.
I've also migrated the documentation in github pages: https://mdelobelle.github.io/metadatamenu/

# 0.1.19
Hi! Metadata Menu 0.1.19 is live with many new features and QOL improvements. (thank you for your feature requests, they gave me many ideas for this version) 🥳
UI improvements: native icons, suggesters instead of dropdown to select and insert fields, better focus in field modals. You should be able to manage your fields without your mouse or arrow keys. Metadata management has become blazzing fast.
There's a "template" option for Input fields to help you fill them: each {{attribute}} will be converted in a dedicated input or dropdown and the input will be filled with the rendered template. See demo 5 in documentation "Input Fields with template"
You can now associate a fileClass with a dataview query: for every file matching the query, the fields settings (type, options...) will be managed by the given fileClass. Usefull to have every file in a folder, or with certain tags, to be applied a fileClass without having to clutter your frontmatter with fileClass attribute. See documentation and especially demo 6 in documentation for full demonstration of fileClass 

# 0.1.15
Metadata Menu 0.1.15 🔥🚀
Add a field directly from a dataview table cell.

# 0.1.14
Metadata Menu 0.1.14 🎉
📆You can now manage Date fields in your metadata:
- insert or modify a date in frontmatter or inline field with a date picker or in natural language (thanks to Natural Language Date plugin)
- insert dates as link or string
- control dates directly from a dataview table

# 0.1.11
Metadata Menu 0.1.11 is live 🥳.
There's a new field type available: File
File fields will be populated with a link to a file in your vault. The selection of this link is facilitated by a dedicated file suggester.
You can also set an optional dataview query to specify which links should be available for this field 🤓

# 0.1.9
all commands including field autocompletion now work for
-   "in-sentence fields" (dataview style [field:: value]) - even within task
-   in list fields (- field:: value)
-   styled fields (**field**:: value...)

# 0.1.5

💡 Types : Metadata Menu can now manage more field types: Number, Boolean, standard Input, Select from list, Multi select from list and Cycle from list.

🔧 Settings : Field types and options can be defined with a unified UX from the plugin settings or from fileClass fields defiinition.

🔎 Dataview : You can benefit from specific controls to modify your fields depending on their types directly from your dataview table 🎉

↕️ The new Number type can be set with a step option (for increment and decrement feature), a min and a max options for field validation

This version comes with a significant refactoring and despite the tests some bugs may remain 🙈. don't hesitate to open an issue in github.

# 0.1.3
🎉 Boolean is now a new supported type in metadatamenu
Boolean fields can be defined either globally in settings (preset fields) or for a given fileClass
From there you can
- toggle boolean fields from context menu
- define a fieldModifier in a dataview table and toggle your boolean field directly from the checkbox in your table ✅

⚠️ fieldWithMenu (introduced in 0.1.1) has been replaced by fieldModifier (see Readme)


# 0.1.1
Modify target file's fields directly from a dataview table (limited to tables created with dataviewjs). See read.me for « how to ».

# 0.1.0
Metadata Menu v0.1.0 is available with styling improvements for modals by @SlRvb (thanks a lot) and an first API (see Readme for details)
It also comes with a lot of code cleaning and refactoring. Not everything is properly tested 🙈 so don’t hesitate to open issues if something is broken.