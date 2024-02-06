import MetadataMenu from "main"
import { Component, DropdownComponent, MetadataCache, Modal, TFile, TextAreaComponent, TextComponent, Vault, Workspace } from "obsidian"
import { FieldsModal } from "src/components/FieldsModal"
import { testFileClassesCreation, testValueModification } from "./test"
import FieldIndex from "src/index/FieldIndex"

export class TestRunner extends Component {
    speed: number = 100
    defaultAction = () => { /**do nothing */ }
    waitingForMetadata: boolean = false
    waitingForIndexing: boolean = false
    waitingForButtonView: string | null = null
    waitingForButtonFileclass: string | undefined = undefined
    waitingForButtonDest: string | undefined = undefined
    waitingForModalForFilePath: string | undefined
    nextActionAfterIndex: (...arg: any[]) => any = this.defaultAction
    nextActionAfterCache: (...arg: any[]) => any = this.defaultAction
    nextActionAfterButton: (...arg: any[]) => any = this.defaultAction
    nextActionAfterFieldsModal: (...arg: any[]) => any = this.defaultAction
    resetAfterIndexAction: boolean = true
    resetAfterCacheAction: boolean = true
    resetAfterButtonAction: boolean = true
    resetAfterFieldModalAction: boolean = true
    modals: Modal[] = []
    vault: Vault
    index: FieldIndex
    metadataCache: MetadataCache
    workspace: Workspace

    constructor(
        public plugin: MetadataMenu
    ) {
        super()
        this.vault = plugin.app.vault
        this.index = plugin.fieldIndex
        this.metadataCache = plugin.app.metadataCache
        this.workspace = plugin.app.workspace
    }

    onload(): void {
        this.registerEvent(
            this.metadataCache.on('metadata-menu:indexed', async () => {
                if (this.waitingForIndexing) {
                    await this.nextActionAfterIndex()
                    if (this.resetAfterIndexAction) {
                        this.waitingForIndexing = false
                        this.nextActionAfterIndex = this.defaultAction
                    }
                }
            })
        )
        this.registerEvent(
            this.metadataCache.on('resolved', async () => {
                if (this.waitingForMetadata) {
                    await this.nextActionAfterCache()
                    if (this.resetAfterCacheAction) {
                        this.waitingForMetadata = false
                        this.nextActionAfterCache = this.defaultAction
                    }
                }
            })
        )
        this.registerEvent(
            this.workspace.on('metadata-menu:button-built', async (destPath: string, viewTypeName: string | null, fileClassName?: string) => {
                if (
                    this.waitingForButtonDest === destPath
                    && this.waitingForButtonFileclass === fileClassName
                    && this.waitingForButtonView === viewTypeName
                ) {
                    await this.nextActionAfterButton()
                    if (this.resetAfterButtonAction) {
                        this.waitingForButtonDest = undefined
                        this.waitingForButtonFileclass = undefined
                        this.waitingForButtonView = null
                        this.nextActionAfterButton = this.defaultAction
                    }
                }
            })
        )
        this.registerEvent(
            this.workspace.on('metadata-menu:fields-modal-built', async (modal: FieldsModal) => {
                if (this.waitingForModalForFilePath === modal.file.path) {
                    console.log(this.nextActionAfterFieldsModal)
                    this.modals.push(modal)
                    await this.nextActionAfterFieldsModal()
                    if (this.resetAfterFieldModalAction) {
                        this.waitingForModalForFilePath = undefined
                        this.nextActionAfterFieldsModal = this.defaultAction
                    }
                }
            })
        )
    }

    async run() {
        await this.clean()
        //await testPresetFieldsCreation(plugin, speed)
        await testFileClassesCreation(this.plugin, this.speed)
        await testValueModification(this.plugin, this.speed)
    }

    async clean() {
        for (const leaf of this.workspace.getLeavesOfType("markdown")) { leaf.detach() }
        this.plugin.presetFields = []
        this.plugin.settings.classFilesPath = ""
        await this.plugin.saveSettings()
        const fileClassFiles = this.vault.getFiles().filter(f => f.parent?.path === "Fileclasses")
        const test3_1 = this.vault.getAbstractFileByPath("Folder3/test3_1_fileclass_frontmatter.md")
        if (test3_1 instanceof TFile) await this.plugin.app.vault.modify(test3_1, "")
        else throw Error("Didn't find 'test3_1.md' in Folder3/")
        for (const fC of fileClassFiles) await this.vault.adapter.remove(fC.path)
        await this.index.fullIndex(true)
        this.metadataCache.cleanupDeletedCache()
        console.log("%c [CLEANED]", "color: blue")
    }

    planActionAfterFieldIndex(action: (...arg: any[]) => any, reset = true) {
        this.nextActionAfterIndex = action
        this.waitingForIndexing = true
        this.resetAfterIndexAction = reset
    }

    planActionAfterMetadataCacheResolution(action: (...arg: any[]) => any, reset = true) {
        this.nextActionAfterCache = action
        this.waitingForMetadata = true
        this.resetAfterCacheAction = reset
    }

    planActionAfterButtonBuilt(destPath: string, viewTypeName: string | null, fileClassName: string | undefined, action: (...arg: any[]) => any, reset = true) {
        this.nextActionAfterButton = action
        this.waitingForButtonDest = destPath
        this.waitingForButtonFileclass = fileClassName
        this.waitingForButtonView = viewTypeName
        this.resetAfterButtonAction = reset
    }

    planActionAfterFieldsModalBuilt(file: TFile, action: (...arg: any[]) => any, reset = true) {
        this.nextActionAfterFieldsModal = action
        this.waitingForModalForFilePath = file.path
        this.resetAfterFieldModalAction = reset
    }

    public log(status: "SUCCESS" | "ERROR", output: string) {
        if (status === "SUCCESS") {
            console.log("%c [SUCCESS]: " + output, 'background: #222; color: #bada55')
        } else {
            console.log("%c [ERROR]: " + output, 'background: red; color: white')
        }
    }

    public insertInInputEl(inputEl: HTMLInputElement | HTMLTextAreaElement, value: string): void {
        inputEl.value = value
        inputEl.dispatchEvent(new Event("input"))
    }

    public insertInTextComponent(input: TextAreaComponent | TextComponent, value: string): void {
        this.insertInInputEl(input.inputEl, value)
    }

    public selectInDropDownComponent(select: DropdownComponent, value: string): void {
        select.selectEl.value = value
        select.selectEl.dispatchEvent(new Event("change"))
    }

    onunload(): void {
        for (const modal of this.modals) {
            modal.close()
        }
    }
}