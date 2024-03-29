import MetadataMenu from "main"
import { Component, DropdownComponent, MetadataCache, Modal, TFile, TextAreaComponent, TextComponent, Vault, Workspace } from "obsidian"
import { FieldsModal } from "src/components/FieldsModal"
import FieldIndex from "src/index/FieldIndex"
import { BaseValueModal } from "src/fields/base/BaseModal"
import { BaseOptions } from "src/fields/base/BaseField"
import { setTimeout } from "timers/promises"
import MetadataMenuSettingTab, { isMetadataMenuSettingTab } from "src/settings/MetadataMenuSettingTab"
import { testPresetFieldsCreation } from "./tests/settingsCreation"
import { fileClassFolder, testFileClassesCreation } from "./tests/fileclassCreation"
import { testFilePath, testValueModification } from "./tests/fieldsModal"

export class TestRunner extends Component {
    speed: number = 10
    defaultAction = () => { /**do nothing */ }
    waitingForMetadata: boolean = false
    waitingForIndexing: boolean = false
    waitingForButtonView: string | null = null
    waitingForButtonFileclass: string | undefined = undefined
    waitingForButtonDest: string | undefined = undefined
    waitingForModalForFilePath: string | undefined
    waitingForModalForFieldId: string | undefined
    nextActionAfterIndex: (...arg: any[]) => any = this.defaultAction
    nextActionAfterCache: (...arg: any[]) => any = this.defaultAction
    nextActionAfterButton: (...arg: any[]) => any = this.defaultAction
    nextActionAfterFieldsModal: (...arg: any[]) => any = this.defaultAction
    nextActionAfterFieldUpdateModal: (...arg: any[]) => any = this.defaultAction
    resetAfterIndexAction: boolean = true
    resetAfterCacheAction: boolean = true
    resetAfterButtonAction: boolean = true
    resetAfterFieldModalAction: boolean = true
    resetAfterFieldUpdateModalAction: boolean = true
    modals: Modal[] = []
    fieldsUpdateModals: BaseValueModal<TFile, BaseOptions>[] = []
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
                    this.modals.push(modal)
                    await this.nextActionAfterFieldsModal()
                    if (this.resetAfterFieldModalAction) {
                        this.waitingForModalForFilePath = undefined
                        this.nextActionAfterFieldsModal = this.defaultAction
                    }
                }
            })
        )

        this.registerEvent(
            this.workspace.on('metadata-menu:field-update-modal-built', async (modal: BaseValueModal<TFile, BaseOptions>) => {
                if (this.waitingForModalForFieldId === modal.managedField.id) {
                    this.fieldsUpdateModals.push(modal)
                    await this.nextActionAfterFieldUpdateModal(modal)
                    if (this.resetAfterFieldUpdateModalAction) {
                        this.waitingForModalForFieldId = undefined
                        this.nextActionAfterFieldUpdateModal = this.defaultAction
                    }
                }
            })
        )
    }

    async run() {
        await this.clean()
        await testPresetFieldsCreation(this.plugin, this.speed)
        await testFileClassesCreation(this.plugin, this.speed)
        await testValueModification(this.plugin, this.speed)
    }


    async clean() {
        for (const leaf of this.workspace.getLeavesOfType("markdown")) { leaf.detach() }
        this.plugin.presetFields = []
        this.plugin.settings.classFilesPath = ""
        await this.plugin.saveSettings()
        const fileClassFiles = this.vault.getFiles().filter(f => f.parent?.path === fileClassFolder)
        const testFile = this.vault.getAbstractFileByPath(testFilePath)
        if (!(testFile instanceof TFile)) return this.plugin.testRunner.log("ERROR", `Didn't find ${testFilePath}`)
        await this.plugin.app.vault.modify(testFile, "")
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

    planActionAfterFieldUpdateModalBuilt(id: string, action: (...arg: any[]) => any, reset = true) {
        this.nextActionAfterFieldUpdateModal = action
        this.waitingForModalForFieldId = id
        this.resetAfterFieldUpdateModalAction = reset
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

export async function openPluginSettings(plugin: MetadataMenu, speed = 100): Promise<MetadataMenuSettingTab> {
    const app = plugin.app
    const setting = app.setting
    await setTimeout(speed)
    setting.open()
    await setTimeout(speed)
    const mdmSettingTab = setting.pluginTabs.find(p => p.id === "metadata-menu")
    if (!mdmSettingTab || !isMetadataMenuSettingTab(mdmSettingTab)) throw Error("Metadatamenu setting tab is undefined")
    mdmSettingTab.navEl.click()
    plugin.testRunner.log("SUCCESS", "openSettingTab")
    await setTimeout(speed)
    return mdmSettingTab
}