import MetadataMenu from "main";
import { FileView, MarkdownView, Notice, TFile, View } from "obsidian";
import NoteFieldsComponent from "src/components/NoteFields";
import Field from "src/fields/Field";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import chooseSectionModal from "src/modals/chooseSectionModal";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FileClassOptionsList from "src/options/FileClassOptionsList";
import OptionsList from "src/options/OptionsList";
import { genuineKeys } from "src/utils/dataviewUtils";
import { insertMissingFields } from "./insertMissingFields";
import { FieldManager as F } from "src/fields/FieldManager";
import { FileClassManager } from "src/components/fileClassManager";
import { FieldType } from "src/types/fieldTypes";
import { updateLookups } from "./updateLookups";
import { updateFormulas } from "./updateFormulas";
import { Note } from "src/note/note";
import * as updates from "src/db/stores/updates"

function addFileClassAttributeOptions(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "fileClassAttr_options",
        name: "All fileClass attributes options",
        icon: "gear",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            const inFileClass = !!(classFilesPath && !!(view?.file) && view.file.path.startsWith(classFilesPath))
            if (checking) {
                return inFileClass
            }
            if (inFileClass) {
                const fieldCommandSuggestModal = new FieldCommandSuggestModal(plugin.app)
                const fileClassOptionsList = new FileClassOptionsList(plugin, view!.file, fieldCommandSuggestModal);
                fileClassOptionsList.createExtraOptionList();
            }
        },
    });
}

function addInsertFileClassAttribute(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "insert_fileClassAttr",
        name: "Insert a new fileClass attribute",
        icon: "list-plus",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            const inFileClass = !!(classFilesPath && !!(view?.file) && view.file.path.startsWith(classFilesPath))
            if (checking) {
                return inFileClass
            }
            if (inFileClass) {
                try {
                    const fileClassName = FileClass.getFileClassNameFromPath(plugin.settings, view!.file.path)
                    if (fileClassName) {
                        const fileClassAttributeModal = new FileClassAttributeModal(plugin, FileClass.createFileClass(plugin, fileClassName))
                        fileClassAttributeModal.open()
                    }
                } catch (error) {
                    new Notice("plugin is not a valid fileClass")
                }
            }
        },
    });
}

function addInsertFieldAtPositionCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "insert_field_at_cursor",
        name: "Choose a field to insert at cursor",
        icon: "list-plus",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile
            }
            if (inFile) {
                const optionsList = new OptionsList(plugin, view!.file, "InsertFieldCommand");
                (async () => await optionsList.createExtraOptionList())()
            }
        }
    })
}

function addFieldOptionsCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "field_options",
        name: "Fields options",
        icon: "gear",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile;
            }
            if (inFile) {
                const fieldCommandSuggestModal = new FieldCommandSuggestModal(plugin.app)
                const optionsList = new OptionsList(plugin, view!.file, fieldCommandSuggestModal);
                (async () => await optionsList.createExtraOptionList())()

            }
        },
    });
}

function addManageFieldAtCursorCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "field_at_cursor_options",
        name: "Manage field at cursor",
        icon: "text-cursor-input",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const editor = view?.editor;
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile && editor !== undefined
            }
            if (inFile && editor !== undefined) {

                const optionsList = new OptionsList(plugin, view!.file, "ManageAtCursorCommand");

                (async function () {
                    const note = await Note.buildNote(plugin, view!.file)
                    const node = note.getNodeAtPosition(editor.getCursor())
                    if (node) optionsList.createAndOpenFieldModal(node)
                    else new Notice("No field with definition at this position", 2000)
                })()
            }
        }
    })
}

function insertMissingFieldsCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "insert_missing_fields",
        name: "Bulk insert missing fields",
        icon: "battery-full",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile
            }
            const dvApi = plugin.app.plugins.plugins.dataview?.api;
            if (dvApi && inFile) {
                const file = view.file;
                const currentFieldsNames = genuineKeys(dvApi.page(file.path))
                if (![...plugin.fieldIndex.filesFields.get(file.path) || []].map(field => field.name).every(fieldName => currentFieldsNames.includes(fieldName))) {
                    new chooseSectionModal(
                        plugin,
                        file,
                        (
                            lineNumber: number,
                            after: boolean,
                            asList: boolean,
                            asComment: boolean
                        ) => insertMissingFields(
                            plugin,
                            file.path,
                            lineNumber,
                            after,
                            asList,
                            asComment
                        )
                    ).open();
                }
            }
        }
    })
}

function addOpenFieldsModalCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "open_fields_modal",
        name: "Open this note's fields modal",
        icon: "clipboard-list",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile
            }
            if (inFile) {
                const file = view.file;
                if (inFile && file instanceof TFile && file.extension === "md") {
                    const noteFieldsComponent = new NoteFieldsComponent(plugin, "1", () => { }, file)
                    plugin.addChild(noteFieldsComponent);
                }
            }
        }
    })
}

function addInsertFieldCommand(plugin: MetadataMenu): void {
    const fields: Field[] = [];
    plugin.presetFields.forEach(f => { if (f.command && f.isRoot()) fields.push(f) });
    [...plugin.fieldIndex.fileClassesFields].forEach(([fileClassName, _fields]) => {
        _fields.forEach(field => { if (field.command && field.isRoot()) { fields.push(field) } })
    });
    fields.forEach(field => {
        if (field.command) {
            const command = field.command
            plugin.addCommand({
                id: command.id,
                name: command.label,
                icon: command.icon,
                checkCallback: (checking: boolean) => {
                    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    const fR = command.id.match(/insert__(?<fileClassName>.*)__(?<fieldName>.*)/)
                    if (checking) {
                        const fileClasses = view?.file ? plugin.fieldIndex.filesFileClasses.get(view?.file.path) : undefined
                        return view?.file &&
                            (
                                fileClasses && fileClasses.some(fileClass => fileClass.name === fR?.groups?.fileClassName) ||
                                !fileClasses && fR?.groups?.fileClassName === "presetField"
                            )
                    }
                    if (fR?.groups && view?.file) {
                        const fieldName = fR.groups.fieldName
                        new chooseSectionModal(
                            plugin,
                            view.file,
                            (
                                lineNumber: number,
                                after: boolean,
                                asList: boolean,
                                asComment: boolean
                            ) => F.openFieldModal(
                                plugin,
                                view.file,
                                fieldName,
                                lineNumber,
                                after,
                                asList,
                                asComment
                            )
                        ).open();
                    }

                }
            })
        }
    })
}

function addFileClassTableViewCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "open_fileclass_view",
        name: "Open fileClass view",
        icon: "file-spreadsheet",
        checkCallback: (checking: boolean) => {
            if (checking) {
                return true
            }
            const activeFilePath = plugin.app.workspace.getActiveFile()?.path
            const fileClass = activeFilePath ? plugin.fieldIndex.fileClassesPath.get(activeFilePath) : undefined
            const fileClassComponent = new FileClassManager(plugin, fileClass)
            plugin.addChild(fileClassComponent);
        }
    })
}

function addUpdateLookupsAndFormulas(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "update_all_lookups",
        name: "Update all lookups and formulas",
        icon: "file-search",
        checkCallback: (checking: boolean) => {
            if (checking) return true;
            plugin.fieldIndex.fullIndex();
        }
    })
}

function addUpdateFileLookupsCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "update_file_lookups",
        name: "Update active file lookups fields",
        icon: "file-search",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile
            }
            if (inFile) {
                const file = view.file;
                if (inFile && file instanceof TFile && file.extension === "md") {
                    const lookupFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(field => field.type === FieldType.Lookup)
                    lookupFields?.forEach(async (field) => {
                        await updateLookups(plugin, { file: file, fieldName: field.name })
                        await plugin.fieldIndex.applyUpdates()
                    })
                }
            }
        }
    })
}

function addUpdateFileFormulasCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "update_file_formulas",
        name: "Update active file formulas fields",
        icon: "function-square",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            if (checking) {
                return inFile
            }
            if (inFile) {
                const file = view.file;
                if (inFile && file instanceof TFile && file.extension === "md") {
                    const formulaFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(field => field.type === FieldType.Formula)
                    formulaFields?.forEach(async (field) => {
                        await updateFormulas(plugin, { file: file, fieldName: field.name })
                        await plugin.fieldIndex.applyUpdates()
                    })
                }
            }
        }
    })
}

function forceIndexFieldsValues(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "force_index_metadatamenu",
        name: "Index MetadataMenu fields",
        icon: "refresh-ccw",
        checkCallback: (checking: boolean) => {
            if (checking) return true
            updates.removeElement(plugin, "fieldsValues")
            plugin.fieldIndex.init()
            plugin.fieldIndex.fullIndex(true)
        }
    })
}

export function addCommands(plugin: MetadataMenu) {
    addFileClassAttributeOptions(plugin);
    addInsertFileClassAttribute(plugin);
    addFieldOptionsCommand(plugin);
    addInsertFieldAtPositionCommand(plugin);
    addManageFieldAtCursorCommand(plugin);
    insertMissingFieldsCommand(plugin);
    addOpenFieldsModalCommand(plugin)
    addInsertFieldCommand(plugin)
    addUpdateFileLookupsCommand(plugin);
    addUpdateFileFormulasCommand(plugin)
    addFileClassTableViewCommand(plugin)
    addUpdateLookupsAndFormulas(plugin)
    forceIndexFieldsValues(plugin)
}