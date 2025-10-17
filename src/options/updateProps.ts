import MetadataMenu from "main"
import { ButtonComponent, debounce, MarkdownView, TFile, View, WorkspaceLeaf } from "obsidian"
import InsertFieldSuggestModal from "src/modals/insertFieldSuggestModal"
import { Note } from "src/note/note"
import OptionsList from "./OptionsList"
import { FieldType, getIcon } from "src/fields/Fields"
import { PropLeaf, PropView } from "src/typings/types"
import { setTimeout } from "timers/promises"

function isPropView(view: MarkdownView | PropView): view is PropView {
    return (view as PropView).file !== undefined;
}

const updateProps = async (plugin: MetadataMenu, view: MarkdownView | PropView, file: TFile) => {
    const optionsList = new OptionsList(plugin, file, "ManageAtCursorCommand")
    const note = new Note(plugin, file)
    await note.build();
    view.metadataEditor.rendered.forEach(item => {
        const key = item.entry.key
        const pseudoField: {
            id: string | undefined,
            type: FieldType | undefined
        } = {
            id: key === plugin.settings.fileClassAlias ?
                `fileclass-field-${plugin.settings.fileClassAlias}` :
                plugin.fieldIndex.filesFields.get(file.path)?.find(_f => _f.isRoot() && _f.name === key)?.id,
            type: key === plugin.settings.fileClassAlias ? "Select" : plugin.fieldIndex.filesFields.get(file.path)?.find(_f => _f.isRoot() && _f.name === key)?.type
        }
        if (!pseudoField.id || !pseudoField.type) return
        const node = note.getNodeForIndexedPath(pseudoField.id)
        if (!node) return
        const buttonsContainers = item.containerEl.findAll(".field-btn-container")
        buttonsContainers.forEach(container => item.containerEl.removeChild(container))
        const btnContainer = item.containerEl.createDiv({ cls: "field-btn-container" })
        if (isPropView(view)) btnContainer.addClass("with-bottom-border")
        const btn = new ButtonComponent(btnContainer)
        btn.setIcon(getIcon(pseudoField.type))
        btn.setClass("property-metadata-menu")
        btn.onClick(() => { optionsList ? optionsList.createAndOpenNodeFieldModal(node) : null })
        item.containerEl.insertBefore(btnContainer, item.valueEl)
    })
    const actionContainer = view.metadataEditor.contentEl.find('.action-container') || view.metadataEditor.contentEl.createDiv({ cls: "action-container" })
    actionContainer.replaceChildren()
    actionContainer.appendChild(view.metadataEditor.addPropertyButtonEl)
    const fileClassButtonsContainer = view.metadataEditor.contentEl.find('.fileclass-btn-container') || view.metadataEditor.contentEl.createDiv({ cls: "fileclass-btn-container" })
    fileClassButtonsContainer.replaceChildren()

    const fileClasses = plugin.fieldIndex.filesFileClasses.get(file.path)
    fileClasses?.forEach(fileClass => {
        const addFieldButton = new ButtonComponent(fileClassButtonsContainer)
        addFieldButton.setClass("add-field-button")
        addFieldButton.setIcon(fileClass.getIcon())
        addFieldButton.onClick(() => (new InsertFieldSuggestModal(plugin, file, -1, false, false)).open())
    })
    actionContainer.appendChild(fileClassButtonsContainer)
}

export async function updatePropertiesSection(plugin: MetadataMenu) {
    const leaves = plugin.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        const view = leaf.view
        if (!(view instanceof MarkdownView) || !(view.file instanceof TFile) || view.file === undefined) continue
        const file = view.file
        if (!plugin.app.vault.getAbstractFileByPath(file.path)) continue
        updateProps(plugin, view, file)
    }
    const currentView = plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if (currentView && currentView.file) {
        const file = currentView.file
        const note = new Note(plugin, file)
        await note.build()
        plugin.indexStatus.checkForUpdate(currentView)
        const focusedElement = document.querySelector(".metadata-property:focus-within")
        if (focusedElement instanceof HTMLElement) {
            const key = focusedElement.dataset.propertyKey
            const field = key && plugin.fieldIndex.filesFields.get(currentView.file!.path)?.find(_f => _f.isRoot() && _f.name === key)

            if (field) {
                const eF = note.getExistingFieldForIndexedPath(field.id)
                focusedElement.find("[class^=metadata-input]")?.setText(eF?.value || "")
            } else if (key === plugin.settings.fileClassAlias) {
                const eF = note.getExistingFieldForIndexedPath(`fileclass-field-${plugin.settings.fileClassAlias}`)
                focusedElement.find("[class^=metadata-input]")?.setText(eF?.value || "")
            }
        }
    }
}

function getPropView(plugin: MetadataMenu): PropView | undefined {
    var propView: PropView | undefined
    plugin.app.workspace.iterateAllLeaves((l: PropLeaf) => {
        if (
            !propView
            && l.view.file
            && l.view.plugin?.id === "properties"
        ) {
            propView = l.view
        }
    })
    return propView
}

export async function updatePropertiesPane(plugin: MetadataMenu) {
    var propView: PropView | undefined
    if (propView && propView.file.path == plugin.app.workspace.getActiveFile()?.path) {
        updateProps(plugin, propView, propView.file)
    } else {
        await setTimeout(300);
        propView = getPropView(plugin)
        if (propView) {
            updateProps(plugin, propView, propView.file)
        }
    }
}

export async function updatePropertiesCommands(plugin: MetadataMenu) {
    if (plugin.settings.enableProperties) {
        updatePropertiesSection(plugin)
        updatePropertiesPane(plugin)
    }
}