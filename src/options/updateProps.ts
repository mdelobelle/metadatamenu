import MetadataMenu from "main"
import { ButtonComponent, MarkdownView, TFile, View } from "obsidian"
import InsertFieldSuggestModal from "src/modals/insertFieldSuggestModal"
import { Note } from "src/note/note"
import { FieldIcon, FieldType } from "src/types/fieldTypes"
import OptionsList from "./OptionsList"

const updateProps = async (plugin: MetadataMenu, view: View) => {
    if (!(view instanceof MarkdownView) || !(view.file instanceof TFile) || view.file === undefined) return
    const file = view.file
    const optionsList = new OptionsList(plugin, file, "ManageAtCursorCommand")
    const note = new Note(plugin, file)
    await note.build();
    view.metadataEditor.rendered.forEach(item => {
        const key = item.entry.key
        const pseudoField: {
            id: string | undefined,
            type: keyof typeof FieldType | undefined
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
        if (plugin.settings.enableProperties) {
            const btnContainer = item.containerEl.createDiv({ cls: "field-btn-container" })
            const btn = new ButtonComponent(btnContainer)
            btn.setIcon(FieldIcon[pseudoField.type])
            btn.setClass("property-metadata-menu")
            btn.onClick(() => { optionsList ? optionsList.createAndOpenFieldModal(node) : null })
            item.containerEl.insertBefore(btnContainer, item.valueEl)
        }
    })
    const actionContainer = view.metadataEditor.contentEl.find('.action-container') || view.metadataEditor.contentEl.createDiv({ cls: "action-container" })
    actionContainer.replaceChildren()
    actionContainer.appendChild(view.metadataEditor.addPropertyButtonEl)
    const fileClassButtonsContainer = view.metadataEditor.contentEl.find('.fileclass-btn-container') || view.metadataEditor.contentEl.createDiv({ cls: "fileclass-btn-container" })
    fileClassButtonsContainer.replaceChildren()
    if (!plugin.settings.enableProperties) return
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
        updateProps(plugin, leaf.view)
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