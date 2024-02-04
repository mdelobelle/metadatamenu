import MetadataMenu from "main"
import { insertAndDispatch, log } from './utils'
import { Field, field, isFieldStyle } from "src/fields/Field"
import { BaseOptions } from "src/fields/base/BaseField"
import { ISettingsModal, areFieldSettingsEqualWithoutId, openSettings } from "src/fields/base/BaseSetting"
import MetadataMenuSettingTab, { isFileClassSettingGroup, isMetadataMenuSettingTab, isPresetFieldsSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { MetadataMenuSettings, UnboundField } from "src/settings/MetadataMenuSettings"
import { setTimeout } from "timers/promises"
import { TFile } from "obsidian"
import { getFieldSettingsTest } from "src/fields/Fields"
import { testFileClassViewNavigation } from "src/fileClass/views/fileClassView"
import { testFileClassSettingsView } from "src/fileClass/views/fileClassSettingsView"
import { FileClass } from "src/fileClass/fileClass"
import { fieldDecorations, FieldStyle, FieldStyleLabel } from "src/types/dataviewTypes"

const speed = 0

export async function run(plugin: MetadataMenu) {
    await clean(plugin)
    await testPresetFields(plugin, speed)
    await testFileClasses(plugin, speed)
}

async function clean(plugin: MetadataMenu) {
    for (const leaf of app.workspace.getLeavesOfType("markdown")) { leaf.detach() }
    plugin.presetFields = []
    plugin.settings.classFilesPath = ""
    await plugin.saveSettings()
    const fileClassFiles = plugin.app.vault.getFiles().filter(f => f.parent?.path === "Fileclasses")
    for (const fC of fileClassFiles) await plugin.app.vault.adapter.remove(fC.path)
    await plugin.fieldIndex.fullIndex(true)
    plugin.app.metadataCache.cleanupDeletedCache()
    console.log("%c [CLEANED]", "color: blue")
}

function getPresetFields(plugin: MetadataMenu, speed = 100): Field[] {
    const presetFieldsFile = plugin.app.vault.getAbstractFileByPath("__fixtures__/settings/presetFields.md")
    if (!presetFieldsFile || !(presetFieldsFile instanceof TFile)) throw Error("Couldn't find preset fields File settings")
    const fields = plugin.app.metadataCache.getFileCache(presetFieldsFile)?.frontmatter?.["fields"] || []
    return fields
}

async function openPluginSettings(plugin: MetadataMenu, speed = 100): Promise<MetadataMenuSettingTab> {
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

async function testPresetFields(plugin: MetadataMenu, speed = 100): Promise<ISettingsModal<BaseOptions> | undefined> {
    const tab = await openPluginSettings(plugin, speed)
    const presetfields = tab.groups.find(g => g.id === "preset-fields-settings")
    if (!presetfields || !isPresetFieldsSettingGroup(presetfields)) throw Error("Preset fields setting is undefined")
    await setTimeout(speed)
    presetfields.settingsContainerShowButton.buttonEl.click()
    log("SUCCESS", "Opening preset fields")
    const fields = getPresetFields(plugin)
    for (const field of fields) {
        field.plugin = plugin
        await enterFieldSettings(field, tab.fieldsContainer, undefined, speed)
    }
    plugin.app.setting.close()
    return
}


async function testFileClasses(plugin: MetadataMenu, speed = 100) {
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
        //Fileclass1.md has to be created before Fileclass2.md for inheritance testing
        .sort((f1, f2) => f1.name < f2.basename ? -1 : 1)
    const addFileClassBtn = document.querySelector(".fileClass-add-button") as HTMLDivElement
    if (!addFileClassBtn) throw Error("Fileclass add button not found")
    for (const fileclass of fileclasses) {
        await testCreateFileClass(plugin, addFileClassBtn, fileclass, speed)
    }
}

async function testCreateFileClass(plugin: MetadataMenu, addBtn: HTMLDivElement, fileClassDataFile: TFile, speed = 100) {
    const fileClassName = fileClassDataFile.basename
    addBtn.click()
    const modal = document.querySelector("#add-new-fileclass-modal")
    if (!modal) throw Error("Add new fileclass modal not found")
    const input = modal.querySelector("#fileclass-name-input") as HTMLInputElement
    if (!input) throw Error("fileclass name input not found")
    input.value = fileClassDataFile.basename
    input.dispatchEvent(new Event("input"))
    await setTimeout(50) // because input is async in this form
    const saveBtn = modal.querySelector("#new-fileclass-confirm-btn") as HTMLDivElement
    saveBtn.dispatchEvent(new Event("click"));
    (modal.querySelector(".modal-close-button") as HTMLDivElement).click();
    await setTimeout(50) // because save is async in this form
    const fileClass = plugin.fieldIndex.fileClassesName.get(fileClassName)
    //clear frontmatterCache for this file to avoid conflict with previous test runs
    if (!fileClass) throw Error(`${fileClassName} wasn't create or indexed`)
    await testFileClassViewNavigation(plugin, fileClass, speed)
    const data = plugin.app.metadataCache.getFileCache(fileClassDataFile)?.frontmatter
    if (!data) throw Error(`${fileClassDataFile.basename} fixture data not found`)
    await testFileClassSettingsView(plugin, fileClass, data, speed)
}

export async function enterFieldSettings(field: Field, container?: HTMLDivElement, fileClass?: FileClass, speed = 100) {
    const plugin = field.plugin
    const fieldModal = openSettings("", fileClass?.name, field.plugin, undefined, container)
    if (!fieldModal) throw Error("Couldn't build new field modal")
    //input the name of the field
    await setTimeout(speed)
    fieldModal.namePromptComponent.setValue(field.name)
    await setTimeout(speed)
    //open type selector modal
    const typeBtn = fieldModal.containerEl.querySelector('#field-type-selector-btn') as HTMLButtonElement
    if (!typeBtn) throw Error("Type selector button not found")
    typeBtn.click()
    fieldModal.typeSelector.open()
    await setTimeout(speed)
    //check that the type is present
    const type = fieldModal.typeSelector.resultContainerEl.querySelector(`.field-type-${field.type}`) as HTMLDivElement
    if (!type) throw Error(`${type} type not found in type selector modal`)
    //don't click it will create a new setting modal that we can't get, 
    fieldModal.typeSelector.close()
    fieldModal.close()
    //Change type will produce a new modal
    const newTypeFieldModal = fieldModal.setType(field.type, fieldModal.typeNameContainer)
    //style
    const _field = newTypeFieldModal.field
    if (field.style && isFieldStyle(field.style)) {
        for (const decoration of Object.keys(field.style)) {
            for (const style of fieldDecorations) {
                if (style && FieldStyleLabel[decoration] === style) {
                    newTypeFieldModal.decorationButtons[style]?.toggleEl.click()
                }
            }
        }
    }
    //TODO (P2) command
    // type settings
    await getFieldSettingsTest(newTypeFieldModal, field, speed = 100)
    // save and compare
    await newTypeFieldModal.save()
    newTypeFieldModal.close()
    let savedField: Field | UnboundField | undefined = undefined
    if (_field.fileClassName) {
        const fileClass = plugin.fieldIndex.fileClassesName.get(_field.fileClassName)
        if (!fileClass) throw Error(`${_field.fileClassName} not found in index`)
        const file = fileClass.getClassFile()
        savedField = (plugin.app.metadataCache.getFileCache(file)?.frontmatter?.fields || [])
            .find((f: Field) => f.name === _field.name && f.path === _field.path)
    } else {
        const presetFields = (await fieldModal.plugin.loadData() as MetadataMenuSettings).presetFields
        savedField = presetFields.find(f => f.name === _field.name)
    }
    if (!savedField) throw Error(`${_field.name} not saved`)
    const STATUS = areFieldSettingsEqualWithoutId(savedField as Field, field) ? "SUCCESS" : "ERROR"
    if (!areFieldSettingsEqualWithoutId(savedField as Field, field)) console.log(savedField, field)
    log(STATUS, `Field ${_field.name} creation`)
}