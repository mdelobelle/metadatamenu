import MetadataMenu from "main";
import { Component, setIcon, TFolder, View } from "obsidian";
import AddNewFileClassModal from "src/modals/AddNewFileClassModal";

interface ExplorerView extends View {
    fileItems: Record<string, {
        selfEl: Element,
        innerEl: Element
    }>
}

export class FileClassFolderButton extends Component {
    constructor(
        private plugin: MetadataMenu
    ) {
        super()
        this.addButton()
    }

    onload(): void {
        this.registerEvent(
            this.plugin.app.workspace.on("layout-change", () => {
                this.addButton()
            })
        )
        this.registerEvent(
            this.plugin.app.metadataCache.on("metadata-menu:indexed", () => {
                this.addButton()
            })
        )
    }

    private addButton() {
        const fCFolderPath = this.plugin.settings.classFilesPath?.replace(/\/$/, "")
        const explorerView = this.plugin.app.workspace.getLeavesOfType("file-explorer")?.[0]?.view as ExplorerView
        if (!explorerView || !fCFolderPath) return
        const fCFolder = explorerView?.fileItems?.[fCFolderPath]
        if (!fCFolder) return
        const container = fCFolder.selfEl
        //clean
        const existingButtons = container.findAll(".fileClass-add-button")
        for (const btn of existingButtons) container.removeChild(btn)
        //add
        if (!container.findAll(".fileClass-add-button").length) {
            const addBtn = container.createDiv({ cls: "fileClass-add-button" })
            setIcon(addBtn, "plus-circle")
            addBtn.onclick = (e) => {
                e.preventDefault();
                (new AddNewFileClassModal(this.plugin)).open()
            }
        }
    }
    static removeBtn(plugin: MetadataMenu) {
        const fCFolderPath = plugin.settings.classFilesPath?.replace(/\/$/, "")
        const explorerView = plugin.app.workspace.getLeavesOfType("file-explorer")?.[0]?.view as ExplorerView
        if (!explorerView || !fCFolderPath) return
        if (!explorerView.fileItems) {
            // Can happen if the sidebar containing the explorerView is reduced (e.g. in zen mode)
            return
        }
        const fCFolder = explorerView.fileItems[fCFolderPath]
        if (!fCFolder) return
        const container = fCFolder.selfEl
        //clean
        const existingButtons = container.findAll(".fileClass-add-button")
        for (const btn of existingButtons) container.removeChild(btn)
    }
}
