import MetadataMenu from "main";
import { MarkdownView, Notice, SuggestModal, TFile } from "obsidian";
import NoteFieldsComponent from "src/components/FieldsModal";
import { AddFileClassToFileModal, FileClass, getFileClassNameFromPath } from "src/fileClass/fileClass";
import chooseSectionModal from "src/modals/chooseSectionModal";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FileClassOptionsList from "src/options/FileClassOptionsList";
import OptionsList from "src/options/OptionsList";
import { insertMissingFields } from "./insertMissingFields";
import { FileClassViewManager } from "src/components/FileClassViewManager";
import { updateLookups } from "./updateLookups";
import { updateFormulas } from "./updateFormulas";
import { Note } from "src/note/note";
import { FieldCommand, Field, fieldValueManager } from "src/fields/Field";
import { openSettings } from "src/fields/base/BaseSetting";
import { ExistingField } from "src/fields/ExistingField";
import { FileClassChoiceModal } from "src/fileClass/fileClassChoiceModal";
import { FILECLASS_VIEW_TYPE, FileClassView } from "src/fileClass/views/fileClassView";
import { SavedView } from "src/fileClass/views/tableViewComponents/saveViewModal";

function fileClassAttributeOptionsCommand(plugin: MetadataMenu) {
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

function insertFileClassAttributeCommand(plugin: MetadataMenu) {
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
                    const fileClassName = getFileClassNameFromPath(plugin.settings, view!.file!.path)
                    if (fileClassName) openSettings("", fileClassName, plugin)
                } catch (error) {
                    new Notice("plugin is not a valid fileClass")
                }
            }
        },
    });
}

function insertFieldAtPositionCommand(plugin: MetadataMenu) {
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

function fieldOptionsCommand(plugin: MetadataMenu) {
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

function manageFieldAtCursorCommand(plugin: MetadataMenu) {
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
                            if (node) optionsList.createAndOpenNodeFieldModal(node)
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
                                    if (node) optionsList.createAndOpenNodeFieldModal(node)
                                    else new Notice("No field with definition at this position", 2000)
                                } else if (key === plugin.settings.fileClassAlias) {
                                    const node = note.getNodeForIndexedPath(`fileclass-field-${plugin.settings.fileClassAlias}`)
                                    if (node) optionsList.createAndOpenNodeFieldModal(node)
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

class AnotherFileClassChoiceModal extends SuggestModal<string> {
    private fileClassesNames: string[];
    constructor(
        private plugin: MetadataMenu,
        private onSelect: (chosenClass: string) => void
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");

        // TODO also include tags? See FileClassViewManager.build.
        this.fileClassesNames = [...plugin.fieldIndex.fileClassesName.keys()];
        console.log("fileClassesNames", this.fileClassesNames);
    }

    getSuggestions(query: string): string[] {
        return this.fileClassesNames
            .filter(name => name.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("value-container");
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.onSelect(item);

        this.close()
    }
}

function insertMissingFieldsForAllFilesCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "insert_missing_fields_for_all_files",
        name: "Bulk insert missing fields for all files",
        icon: "battery-full",
        callback: () => {
            console.log("Starting inserting missing fields for all files.");

            const modal = new AnotherFileClassChoiceModal(plugin, (chosenClassName: string) => {
                console.log("chosen class:", chosenClassName);

                // Take only the files that match the chosenClass.
                const chosenClass: FileClass | undefined = plugin.fieldIndex.fileClassesName.get(chosenClassName);
                if (!chosenClass) {
                    console.log(`Cannot find FileClass ${chosenClassName}`);
                    return;
                }

                const filesWithChosenClass: Array<TFile> = Array.from(plugin.fieldIndex.filesFileClasses).filter(([filepath, fileClasses]: [string, FileClass[]]) => {
                    return fileClasses.contains(chosenClass);
                }).map(([filepath,]: [string, FileClass[]]) => {
                    return plugin.app.vault.getAbstractFileByPath(filepath) as TFile;
                });
                console.log(filesWithChosenClass);

                // Update all these files.
                (async () => {
                    // await insertMissingFields(plugin, filesWithChosenClass[0].path, -1);
                    // console.log(`updated ${filesWithChosenClass[0].path}`);
                    await Promise.all(filesWithChosenClass.map((file: TFile) => {
                        // Async call (run everything in parallel)
                        insertMissingFields(plugin, file.path, -1);
                    }));
                })();
                console.log("Finished inserting missing fields for all files.");
            });
            modal.open();
        }
    });
}

function openFieldsModalCommand(plugin: MetadataMenu) {
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

export function insertFieldCommand(plugin: MetadataMenu, command: FieldCommand, field: Field, fileClassName?: string) {
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
                    ) => {
                        fieldValueManager(plugin, field.id, field.fileClassName, view.file!, undefined, undefined, lineNumber, asList, asBlockquote)?.openModal()
                    }
                ).open();
            }
        }
    })
}

export function insertIFieldCommand(plugin: MetadataMenu, command: FieldCommand, field: Field, fileClassName?: string) {
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
                    ) => {
                        fieldValueManager(plugin, field.id, field.fileClassName, view.file!, undefined, undefined, lineNumber, asList, asBlockquote)
                    }
                ).open();
            }
        }
    })
}

function insertFieldsCommand(plugin: MetadataMenu): void {
    const fields: { field: Field, fileClassName: string | undefined }[] = [];
    plugin.presetFields.forEach(f => { if (f.command && f.isRoot()) fields.push({ field: f, fileClassName: undefined }) });
    [...plugin.fieldIndex.fileClassesFields].forEach(([fileClassName, _fields]) => {
        _fields.forEach(field => { if (field.command && field.isRoot()) { fields.push({ field: field, fileClassName: fileClassName }) } })
    });
    fields.forEach(_field => {
        if (_field.field.command) {
            const { field, fileClassName } = _field
            const command = field.command!
            insertFieldCommand(plugin, command, field, fileClassName)
        }
    })
}

function openFileclassViewCommand(plugin: MetadataMenu) {
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


function fileclassToFileCommand(plugin: MetadataMenu) {
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

function updateLookupsAndFormulasCommand(plugin: MetadataMenu) {
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

function updateFileLookupsCommand(plugin: MetadataMenu) {
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
                    const lookupFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(field => field.type === "Lookup")
                    lookupFields?.forEach(async (field) => {
                        await updateLookups(plugin, { file: file, fieldName: field.name })
                        await plugin.fieldIndex.applyUpdates()
                    })
                }
            }
        }
    })
}

function updateFileFormulasCommand(plugin: MetadataMenu) {
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
                    const formulaFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(field => field.type === "Formula")
                    formulaFields?.forEach(async (field) => {
                        await updateFormulas(plugin, { file: file, fieldName: field.name })
                        await plugin.fieldIndex.applyUpdates()
                    })
                }
            }
        }
    })
}

function updateTableViewCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "update_table_view",
        name: "Update table view",
        icon: "function-square",
        checkCallback: (checking: boolean) => {
            const fileClassName: string | undefined = (plugin.app.workspace.activeLeaf?.view as FileClassView).name;
            const fileClassViewType = FILECLASS_VIEW_TYPE + "__" + fileClassName;
            const view = plugin.app.workspace.getLeavesOfType(fileClassViewType)[0]?.view as FileClassView | undefined;
            if (view) {
                if (checking) {
                    return true;
                }
                // view.tableView.saveViewBtn.onClick
                // view.tableView.build();  // force refresh

                if (view.tableView.selectedView !== undefined) {
                    const currentViewName: string = view.selectedView as string;

                    const savedView = new SavedView("");
                    savedView.children = view.tableView.fieldSet.children.map(c => c.name);
                    savedView.buildFilters(view.tableView.fieldSet.filters);
                    savedView.buildRowSorters(view.tableView.fieldSet.rowSorters);
                    savedView.buildColumnManagers(view.tableView.fieldSet.columnManagers);
                    savedView.name = currentViewName;

                    const options = view.fileClass.getFileClassOptions();
                    options.savedViews = [...options.savedViews?.filter(v => v.name !== currentViewName) || [], savedView]
                    view.tableView.selectedView = savedView.name
                    view.tableView.favoriteBtn.buttonEl.disabled = false
                    view.tableView.update()
                    view.tableView.viewSelect.setValue(currentViewName);
                    view.tableView.saveViewBtn.removeCta()
                } else {
                    view.tableView.update();
                }

                // TODO: restore page and scrolling level
            }
        }
    })
}

function focusSearchInTableViewCommand(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "focus_search_in_table_view",
        name: "Focus on search input in table view",
        icon: "search",
        checkCallback: (checking: boolean) => {
            const fileClassName: string | undefined = (plugin.app.workspace.activeLeaf?.view as FileClassView).name;
            const fileClassViewType = FILECLASS_VIEW_TYPE + "__" + fileClassName;
            const view = plugin.app.workspace.getLeavesOfType(fileClassViewType)[0]?.view as FileClassView | undefined;
            if (view) {
                if (checking) {
                    return true;
                }

                const searchInput = document.querySelector('.metadata-menu.fileclass-view .options .search input');
                if (searchInput) {
                    (searchInput as HTMLInputElement).focus();
                } else {
                    console.error('Search input not found');
                }
            }
        }
    })
}

export function addCommands(plugin: MetadataMenu) {
    fileClassAttributeOptionsCommand(plugin);
    insertFileClassAttributeCommand(plugin);
    fieldOptionsCommand(plugin);
    insertFieldAtPositionCommand(plugin);
    manageFieldAtCursorCommand(plugin);
    insertMissingFieldsCommand(plugin);
    insertMissingFieldsForAllFilesCommand(plugin);
    openFieldsModalCommand(plugin);
    insertFieldsCommand(plugin);
    updateFileLookupsCommand(plugin);
    updateFileFormulasCommand(plugin);
    openFileclassViewCommand(plugin);
    fileclassToFileCommand(plugin);
    updateLookupsAndFormulasCommand(plugin);
    updateTableViewCommand(plugin);
    focusSearchInTableViewCommand(plugin);
}