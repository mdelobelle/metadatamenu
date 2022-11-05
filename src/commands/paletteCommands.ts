import MetadataMenu from "main";
import { FileView, MarkdownView, Notice, TFile, View } from "obsidian";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import chooseSectionModal from "src/modals/chooseSectionModal";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import FileClassOptionsList from "src/options/FileClassOptionsList";
import OptionsList from "src/options/OptionsList";
import { genuineKeys } from "src/utils/dataviewUtils";
import { frontMatterLineField, getLineFields } from "src/utils/parser";
import { insertMissingFields } from "./insertMissingFields";

function addFileClassAttributeOptions(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "fileClassAttr_options",
        name: "fileClass attributes options",
        icon: "gear",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            if (checking) {
                return !!(classFilesPath && !!(view?.file) && view.file.path.startsWith(classFilesPath))
            }
            if (!!(classFilesPath && !!(view?.file) && view.file.path.startsWith(classFilesPath))) {
                const fieldCommandSuggestModal = new FieldCommandSuggestModal(plugin.app)
                const optionsList = new FileClassOptionsList(plugin, view!.file, fieldCommandSuggestModal);
                optionsList.createExtraOptionList();
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
            if (checking) {
                return !!(classFilesPath && !!(view?.file) && view.file.path.startsWith(classFilesPath))
            }
            try {
                const fileClassName = FileClass.getFileClassNameFromPath(plugin, view!.file.path)
                if (fileClassName) {
                    const fileClassAttributeModal = new FileClassAttributeModal(plugin, FileClass.createFileClass(plugin, fileClassName))
                    fileClassAttributeModal.open()
                }
            } catch (error) {
                new Notice("plugin is not a valid fileClass")
            }
        },
    });
}

function addInsertFieldAtPositionCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "insert_field_at_cursor",
        name: "insert field at cursor",
        icon: "list-plus",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            if (checking) {
                return !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            }
            const optionsList = new OptionsList(plugin, view!.file, "InsertFieldCommand");
            optionsList.createExtraOptionList();
        }
    })
}

function addFieldOptionsCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "field_options",
        name: "field options",
        icon: "gear",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
            if (checking) {
                return !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
            }
            const fieldCommandSuggestModal = new FieldCommandSuggestModal(plugin.app)
            const optionsList = new OptionsList(plugin, view!.file, fieldCommandSuggestModal);
            optionsList.createExtraOptionList();
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
            if (checking) {
                const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
                return inFile && editor !== undefined
            }
            const optionsList = new OptionsList(plugin, view!.file, "ManageAtCursorCommand")
            const frontmatter = plugin.app.metadataCache.getFileCache(view!.file)?.frontmatter;
            if (frontmatter && editor
                && editor.getCursor().line > frontmatter.position.start.line
                && editor.getCursor().line < frontmatter.position.end.line) {
                const attribute = frontMatterLineField(editor.getLine(editor.getCursor().line))
                if (attribute) optionsList.createAndOpenFieldModal(attribute)
            } else if (editor) {
                const { attribute, values } = getLineFields(editor.getLine(editor.getCursor().line)).find(field =>
                    editor.getCursor().ch <= field.index + field.length
                    && editor.getCursor().ch >= field.index) || {};
                if (attribute) optionsList.createAndOpenFieldModal(attribute)
            }
        }

    })
}

function insertMissingFieldsCommand(plugin: MetadataMenu) {
    const classFilesPath = plugin.settings.classFilesPath
    plugin.addCommand({
        id: "insert_missing_fields",
        name: "Insert missing fields",
        icon: "battery-full",
        checkCallback: (checking: boolean) => {
            const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (checking) {
                const inFile = !!(view?.file && (!classFilesPath || !view.file.path.startsWith(classFilesPath)))
                return inFile
            }
            const dvApi = plugin.app.plugins.plugins.dataview?.api;
            const file = view?.file
            if (dvApi && file) {
                const currentFieldsNames = genuineKeys(dvApi.page(file.path))
                if (![...plugin.fieldIndex.filesFields.get(file.path) || []].map(field => field.name).every(fieldName => currentFieldsNames.includes(fieldName))) {
                    new chooseSectionModal(
                        plugin,
                        file,
                        (
                            lineNumber: number,
                            inFrontmatter: boolean,
                            after: boolean,
                            asList: boolean,
                            asComment: boolean
                        ) => insertMissingFields(
                            plugin,
                            file.path,
                            lineNumber,
                            inFrontmatter,
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

function addUpdateLookups(plugin: MetadataMenu) {
    plugin.addCommand({
        id: "update_formulas",
        name: "Update formulas fields",
        icon: "function-square",
        checkCallback: (checking: boolean) => {
            if (checking) return true;
            plugin.fieldIndex.fullIndex("command", true);
        }
    })
}

export function addCommands(plugin: MetadataMenu, view: View | undefined | null) {
    const classFilesPath = plugin.settings.classFilesPath
    if (view && view instanceof FileView) {
        const file = plugin.app.vault.getAbstractFileByPath(view.file.path)
        if (file instanceof TFile && file.extension === 'md') {
            if (classFilesPath && file.path.startsWith(classFilesPath)) {
                addFileClassAttributeOptions(plugin);
                addInsertFileClassAttribute(plugin);
            } else {
                addFieldOptionsCommand(plugin);
                addInsertFieldAtPositionCommand(plugin);
                addManageFieldAtCursorCommand(plugin);
                insertMissingFieldsCommand(plugin);
            }
        }
    }
    addUpdateLookups(plugin)
}

/*

function addFieldsModalCommand(): void{
    const file = plugin.app.vault.getAbstractFileByPath(`${plugin.destName}.md`)
                        if (file instanceof TFile && file.extension === "md") {
                            const noteFieldsComponent = new NoteFieldsComponent(plugin, "1", () => { }, file)
                            plugin.addChild(noteFieldsComponent);
                        }
}
*/