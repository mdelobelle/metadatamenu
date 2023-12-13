import MetadataMenu from "main";
import { MarkdownView, Notice, TFile } from "obsidian";
import NoteFieldsComponent from "src/components/NoteFields";
import Field, { FieldCommand } from "src/fields/Field";
import { AddFileClassToFileModal, FileClass } from "src/fileClass/fileClass";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import chooseSectionModal from "src/modals/chooseSectionModal";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FileClassOptionsList from "src/options/FileClassOptionsList";
import OptionsList from "src/options/OptionsList";
import { insertMissingFields } from "./insertMissingFields";
import { FieldManager as F } from "src/fields/FieldManager";
import { FileClassViewManager } from "src/components/FileClassViewManager";
import { FieldType } from "src/types/fieldTypes";
import { updateLookups } from "./updateLookups";
import { updateFormulas } from "./updateFormulas";
import { Note } from "src/note/note";

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
                const fileClassOptionsList = new FileClassOptionsList(plugin, view!.file!, fieldCommandSuggestModal);
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
                    const fileClassName = FileClass.getFileClassNameFromPath(plugin.settings, view!.file!.path)
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
                const optionsList = new OptionsList(plugin, view!.file!, "InsertFieldCommand");
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
                const optionsList = new OptionsList(plugin, view!.file!, fieldCommandSuggestModal);
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

                const optionsList = new OptionsList(plugin, view!.file!, "ManageAtCursorCommand");

                (async function () {
                    const note = await Note.buildNote(plugin, view!.file!)
                    switch (view.getMode()) {
                        case "source": {
                            const node = note.getNodeAtPosition(editor.getCursor())
                            if (node) optionsList.createAndOpenFieldModal(node)
                            else new Notice("No field with definition at this position", 2000)
                        }
                            break;
                        case "preview": {
                            const focusedElement = document.querySelector(".metadata-property:focus-within")
                            if (focusedElement instanceof HTMLElement) {
                                const key = focusedElement.dataset.propertyKey
                                const field = key && plugin.fieldIndex.filesFields.get(view.file!.path)?.find(_f => _f.isRoot() && _f.name === key)
                                if (field) {
                                    const node = note.getNodeForIndexedPath(field.id)
                                    if (node) optionsList.createAndOpenFieldModal(node)
                                    else new Notice("No field with definition at this position", 2000)
                                } else if (key === plugin.settings.fileClassAlias) {
                                    const node = note.getNodeForIndexedPath(`fileclass-field-${plugin.settings.fileClassAlias}`)
                                    if (node) optionsList.createAndOpenFieldModal(node)
                                    else new Notice("No field with definition at this position", 2000)
                                }
                            }
                            break;
                        }
                    }

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
            if (inFile) {
                (async function () {
                    const file = view.file!;
                    const existingFields = await Note.getExistingFields(plugin, file)
                    const existingFieldsNames = existingFields.map(eF => eF.field.name)
                    if (![...plugin.fieldIndex.filesFields.get(file.path) || []]
                        .map(field => field.name)
                        .every(fieldName => existingFieldsNames.includes(fieldName))) {
                        new chooseSectionModal(
                            plugin,
                            file,
                            (
                                lineNumber: number,
                                asList: boolean,
                                asBlockquote: boolean
                            ) => insertMissingFields(
                                plugin,
                                file.path,
                                lineNumber,
                                asList,
                                asBlockquote
                            )
                        ).open();
                    }
                })()
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

export function addInsertFieldCommand(plugin: MetadataMenu, command: FieldCommand, field: Field, fileClassName?: string) {
    plugin.addCommand({
        id: command.id,
        name: command.label,
        icon: command.icon,
        checkCallback: (checking: boolean): boolean | void => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            const fR = command.id.match(/insert__(?<fieldId>.*)/)
            const fileClasses = view?.file ? plugin.fieldIndex.filesFileClasses.get(view?.file.path) : undefined
            const belongsToView = field !== undefined && !!view?.file &&
                (
                    !!fileClasses && fileClasses.some(fileClass => fileClass.name === fileClassName) ||
                    (!fileClasses && !fileClassName)
                )
            if (checking) return belongsToView
            if (view?.file && field) {
                new chooseSectionModal(
                    plugin,
                    view.file,
                    (
                        lineNumber: number,
                        asList: boolean,
                        asBlockquote: boolean
                    ) => F.openFieldModal(
                        plugin,
                        view.file!,
                        field.name,
                        lineNumber,
                        asList,
                        asBlockquote
                    )
                ).open();
            }
        }
    })
}

function addInsertFieldsCommand(plugin: MetadataMenu): void {
    const fields: { field: Field, fileClassName: string | undefined }[] = [];
    plugin.presetFields.forEach(f => { if (f.command && f.isRoot()) fields.push({ field: f, fileClassName: undefined }) });
    [...plugin.fieldIndex.fileClassesFields].forEach(([fileClassName, _fields]) => {
        _fields.forEach(field => { if (field.command && field.isRoot()) { fields.push({ field: field, fileClassName: fileClassName }) } })
    });
    fields.forEach(_field => {
        if (_field.field.command) {
            const { field, fileClassName } = _field
            const command = field.command!
            addInsertFieldCommand(plugin, command, field, fileClassName)
        }
    })
}

function addOpenFileclassViewCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "open_fileclass_view",
        name: "Open fileClass view",
        icon: "package",
        checkCallback: (checking: boolean) => {
            if (checking) {
                return true
            }
            const activeFilePath = plugin.app.workspace.getActiveFile()?.path
            const fileClass = activeFilePath ? plugin.fieldIndex.fileClassesPath.get(activeFilePath) : undefined
            const fileClassComponent = new FileClassViewManager(plugin, fileClass)
            plugin.addChild(fileClassComponent);
            fileClassComponent.build()
        }
    })
}


function addFileclassToFileCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "add_fileclass_to_file",
        name: "Add fileClass to file",
        icon: "package-plus",
        checkCallback: (checking: boolean) => {
            const activeFile = plugin.app.workspace.getActiveFile()
            if (checking) {
                return !!activeFile
            }
            if (activeFile) {
                const modal = new AddFileClassToFileModal(plugin, activeFile)
                modal.open()

            }
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
            plugin.fieldIndex.fullIndex(true);
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
            if (checking) return true;
            (async function () {
                plugin.fieldIndex.fullIndex(true)
            })()
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
    addInsertFieldsCommand(plugin)
    addUpdateFileLookupsCommand(plugin);
    addUpdateFileFormulasCommand(plugin)
    addOpenFileclassViewCommand(plugin)
    addFileclassToFileCommand(plugin)
    addUpdateLookupsAndFormulas(plugin)
    forceIndexFieldsValues(plugin)
}