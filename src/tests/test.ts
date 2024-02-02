import MetadataMenu from "main"
import { insertAndDispatch, log } from './utils'
import { Field, field } from "src/fields/Field"
import { BaseOptions } from "src/fields/base/BaseField"
import { ISettingsModal, areFieldSettingsEqualWithoutId, openSettings } from "src/fields/base/BaseSetting"
import MetadataMenuSettingTab, { isFileClassSettingGroup, isMetadataMenuSettingTab, isPresetFieldsSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { MetadataMenuSettings } from "src/settings/MetadataMenuSettings"
import { setTimeout } from "timers/promises"
import { TFile } from "obsidian"
import { getFieldSettingsTest } from "src/fields/Fields"
import { testFileClassViewNavigation } from "src/fileClass/views/fileClassView"
import { testFileClassSettingsView } from "src/fileClass/views/fileClassSettingsView"

const speed = 0

export async function run(plugin: MetadataMenu) {
    await setTimeout(1000)
    await clean(plugin)
    //await testPresetFields(plugin)
    await testFileClasses(plugin)
}

async function clean(plugin: MetadataMenu) {
    plugin.presetFields = []
    plugin.settings.classFilesPath = ""
    await plugin.saveSettings()
    const fileClassFiles = plugin.app.vault.getFiles().filter(f => f.parent?.path === "Fileclasses")
    for (const fC of fileClassFiles) await plugin.app.vault.adapter.remove(fC.path)
    await plugin.fieldIndex.fullIndex(true)
    console.log("%c [CLEANED]", "color: blue")
}

function getPresetFields(plugin: MetadataMenu): Field[] {
    const presetFieldsFile = plugin.app.vault.getAbstractFileByPath("__fixtures__/settings/presetFields.md")
    if (!presetFieldsFile || !(presetFieldsFile instanceof TFile)) throw Error("Couldn't find preset fields File settings")
    const fields = plugin.app.metadataCache.getFileCache(presetFieldsFile)?.frontmatter?.["fields"] || []
    return fields
}

async function openPluginSettings(plugin: MetadataMenu): Promise<MetadataMenuSettingTab> {
    const app = plugin.app
    const setting = app.setting
    await setTimeout(speed)
    setting.open()
    await setTimeout(speed)
    const mdmSettingTab = setting.pluginTabs.find(p => p.id === "metadata-menu")
    if (!mdmSettingTab || !isMetadataMenuSettingTab(mdmSettingTab)) throw Error("Metadatamenu setting tab is undefined")
    mdmSettingTab.navEl.click()
    log("SUCCESS", "openSettingTab")
    await setTimeout(speed)
    return mdmSettingTab
}

async function testPresetFields(plugin: MetadataMenu): Promise<ISettingsModal<BaseOptions> | undefined> {
    const tab = await openPluginSettings(plugin)
    const presetfields = tab.groups.find(g => g.id === "preset-fields-settings")
    if (!presetfields || !isPresetFieldsSettingGroup(presetfields)) throw Error("Preset fields setting is undefined")
    await setTimeout(speed)
    presetfields.settingsContainerShowButton.buttonEl.click()
    log("SUCCESS", "Opening preset fields")
    const fields = getPresetFields(plugin)
    for (const field of fields) {
        field.plugin = plugin
        await enterFieldSettings(field, tab)
    }
    plugin.app.setting.close()
    return
}

async function enterFieldSettings(field: Field, settingTab: MetadataMenuSettingTab) {
    const emptyFieldModal = openSettings("", undefined, field.plugin, undefined, settingTab.fieldsContainer)
    if (!emptyFieldModal) throw Error("Couldn't build new field modal")
    //input the name of the field
    await setTimeout(speed)
    emptyFieldModal.namePromptComponent.setValue(field.name)
    await setTimeout(speed)
    //open type selector modal
    const typeBtn = emptyFieldModal.containerEl.querySelector('#field-type-selector-btn') as HTMLButtonElement
    if (!typeBtn) throw Error("Type selector button not found")
    typeBtn.click()
    emptyFieldModal.typeSelector.open()
    await setTimeout(speed)
    //check that the type is present
    const type = emptyFieldModal.typeSelector.resultContainerEl.querySelector(`.field-type-${field.type}`) as HTMLDivElement
    if (!type) throw Error(`${type} type not found in type selector modal`)
    //don't click it will create a new setting modal that we can't get, 
    emptyFieldModal.typeSelector.close()
    emptyFieldModal.close()
    await enterTypeFieldSetting(emptyFieldModal, field)
}

async function enterTypeFieldSetting(settingModal: ISettingsModal<BaseOptions>, field: Field) {
    const newTypeFieldModal = settingModal.setType(field.type, settingModal.typeNameContainer)
    await getFieldSettingsTest(newTypeFieldModal, field)
    newTypeFieldModal.save()
    const presetFields = (await settingModal.plugin.loadData() as MetadataMenuSettings).presetFields
    const savedField = presetFields.find(f => f.name === field.name)
    if (!savedField) throw Error(`${field.name} not saved`)
    const STATUS = areFieldSettingsEqualWithoutId(savedField as Field, field) ? "SUCCESS" : "ERROR"
    log(STATUS, `preset field ${field.name} creation`)
    newTypeFieldModal.close()
}

async function testFileClasses(plugin: MetadataMenu) {
    const tab = await openPluginSettings(plugin)
    const fileClassSettings = tab.groups.find(g => g.id === "fileclass-settings")
    if (!fileClassSettings || !isFileClassSettingGroup(fileClassSettings)) throw Error("Fileclass setting group is undefined")
    await setTimeout(speed)
    // fileclass folder settings
    fileClassSettings.settingsContainerShowButton.buttonEl.click()
    insertAndDispatch(fileClassSettings.fileClassPathInput, "Fileclasses")
    fileClassSettings.fileClassesFolderSaveButton.buttonEl.click()
    plugin.app.setting.close()
    const fileclasses = plugin.app.vault.getFiles()
        .filter(f => f.parent?.path === "__fixtures__/fileClasses")
        .sort((f1, f2) => f1.name < f2.basename ? -1 : 1)
    const addFileClassBtn = document.querySelector(".fileClass-add-button") as HTMLDivElement
    if (!addFileClassBtn) throw Error("Fileclass add button not found")
    for (const fileclass of fileclasses) {
        await testCreateFileClass(plugin, addFileClassBtn, fileclass)
    }
}

async function testCreateFileClass(plugin: MetadataMenu, addBtn: HTMLDivElement, fileClassDataFile: TFile) {
    const fileClassName = fileClassDataFile.basename
    addBtn.click()
    const modal = document.querySelector("#add-new-fileclass-modal")
    if (!modal) throw Error("Add new fileclass modal not found")
    const input = modal.querySelector("#fileclass-name-input") as HTMLInputElement
    if (!input) throw Error("fileclass name input not found")
    input.value = fileClassDataFile.basename
    input.dispatchEvent(new Event("input"))
    await setTimeout(500) // because input is async in this form
    const saveBtn = modal.querySelector("#new-fileclass-confirm-btn") as HTMLDivElement
    saveBtn.dispatchEvent(new Event("click"));
    (modal.querySelector(".modal-close-button") as HTMLDivElement).click();
    await setTimeout(500) // because save is async in this form
    const fileClass = plugin.fieldIndex.fileClassesName.get(fileClassName)
    if (!fileClass) throw Error(`${fileClassName} wasn't create or indexed`)
    await testFileClassViewNavigation(plugin, fileClass)
    const data = plugin.app.metadataCache.getFileCache(fileClassDataFile)?.frontmatter
    if (!data) throw Error(`${fileClassDataFile.basename} fixture data not found`)
    await testFileClassSettingsView(plugin, fileClass, data)
}

