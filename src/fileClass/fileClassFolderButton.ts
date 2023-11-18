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
            this.plugin.app.workspace.on("metadata-menu:indexed", () => {
                this.addButton()
            })
        )
    }

    private addButton() {
        const fCFolderPath = this.plugin.settings.classFilesPath?.replace(/\/$/, "")
        const explorerView = this.plugin.app.workspace.getLeavesOfType("file-explorer")?.[0].view as ExplorerView
        if (!explorerView || !fCFolderPath) return
        const fCFolder = explorerView.fileItems[fCFolderPath]
        if (!fCFolder) return
        const container = fCFolder.selfEl
        //clean
        const existingButtons = explorerView.containerEl.findAll(".fileClass-add-button")
        for (const btn of existingButtons) container.removeChild(btn)
        //add
        const addBtn = container.createDiv({ cls: "fileClass-add-button" })
        setIcon(addBtn, "plus-circle")
        addBtn.onclick = (e) => {
            e.preventDefault();
            (new AddNewFileClassModal(this.plugin)).open()
        }

    }
}