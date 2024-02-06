import MetadataMenu from "main"
import { Field, isFieldStyle } from "src/fields/Field"
import { BaseOptions } from "src/fields/base/BaseField"
import { ISettingsModal, areFieldSettingsEqualWithoutId, openSettings } from "src/fields/base/BaseSetting"
import MetadataMenuSettingTab, { isFileClassSettingGroup, isMetadataMenuSettingTab, isPresetFieldsSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { MetadataMenuSettings, UnboundField } from "src/settings/MetadataMenuSettings"
import { setTimeout } from "timers/promises"
import { MarkdownView, TFile } from "obsidian"
import { getFieldSettingsTest } from "src/fields/Fields"
import { testFileClassViewNavigation } from "src/fileClass/views/fileClassView"
import { testFileClassSettingsView } from "src/fileClass/views/fileClassSettingsView"
import { FileClass } from "src/fileClass/fileClass"
import { fieldDecorations, FieldStyle, FieldStyleLabel } from "src/types/dataviewTypes"

const speed = 0

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
    plugin.testRunner.log("SUCCESS", "openSettingTab")
    await setTimeout(speed)
    return mdmSettingTab
}

export async function testPresetFieldsCreation(plugin: MetadataMenu, speed = 100): Promise<ISettingsModal<BaseOptions> | undefined> {
    const tab = await openPluginSettings(plugin, speed)
    const presetfields = tab.groups.find(g => g.id === "preset-fields-settings")
    if (!presetfields || !isPresetFieldsSettingGroup(presetfields)) throw Error("Preset fields setting is undefined")
    await setTimeout(speed)
    presetfields.settingsContainerShowButton.buttonEl.click()
    plugin.testRunner.log("SUCCESS", "Opening preset fields")
    const fields = getPresetFields(plugin)
    for (const field of fields) {
        field.plugin = plugin
        await enterFieldSettings(field, tab.fieldsContainer, undefined, speed)
    }
    plugin.app.setting.close()
    return
}


export async function testFileClassesCreation(plugin: MetadataMenu, speed = 100): Promise<void> {
    const tab = await openPluginSettings(plugin)
    const fileClassSettings = tab.groups.find(g => g.id === "fileclass-settings")
    if (!fileClassSettings || !isFileClassSettingGroup(fileClassSettings)) throw Error("Fileclass setting group is undefined")
    await setTimeout(speed)
    // fileclass folder settings
    fileClassSettings.settingsContainerShowButton.buttonEl.click()
    plugin.testRunner.insertInTextComponent(fileClassSettings.fileClassPathInput, "Fileclasses")
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
    plugin.testRunner.insertInInputEl(input, fileClassDataFile.basename)
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
    plugin.testRunner.log(STATUS, `Field ${_field.name} creation`)
}

export async function testValueModification(plugin: MetadataMenu, speed = 100) {
    await testMetadataMenuButton(plugin, speed)
}

async function testMetadataMenuButton(plugin: MetadataMenu, speed = 100) {
    const test3_1 = plugin.app.vault.getAbstractFileByPath("Folder3/test3_1_fileclass_frontmatter.md")
    if (!test3_1) throw Error("test3_1 not found in Folder3")
    await plugin.app.workspace.openLinkText(test3_1.path, test3_1.path)
    const leaf = plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if (!leaf?.file || !(leaf.file instanceof TFile) || leaf.file.path !== "Folder3/test3_1_fileclass_frontmatter.md") throw Error("Active pane isn't test3_1")
    const addFileClassCommand = plugin.app.commands.commands["metadata-menu:add_fileclass_to_file"]
    if (!addFileClassCommand || !addFileClassCommand.checkCallback) throw Error("AddFileClass command not found")
    addFileClassCommand.checkCallback(false)
    const fileClassName = "Fileclass1"
    const choice = document.querySelector(`#fileclass-${fileClassName}-add-choice`) as HTMLDivElement
    if (!choice) throw Error("Fileclass choice not found")
    plugin.testRunner.planActionAfterMetadataCacheResolution(async () => {
        await checkFileClass(plugin, leaf.file!, fileClassName, speed)
    })
    choice.click()
}

async function checkFileClass(plugin: MetadataMenu, file: TFile, fileClassName: string, speed = 100) {
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter
    if (frontmatter?.["fileClass"] === fileClassName) plugin.testRunner.log("SUCCESS", "Adding FileClass to file")
    plugin.testRunner.planActionAfterButtonBuilt(file.path.replace(/\.md$/, ""), "tabHeader", fileClassName, async () => { await openFieldsModal(plugin, file, speed) })
}

async function openFieldsModal(plugin: MetadataMenu, file: TFile, speed = 100) {
    const tab = document.querySelector(".workspace-tab-header[aria-label=test3_1_fileclass_frontmatter]")
    if (!tab) throw Error("tab not found")
    const button = tab.querySelector("a.metadata-menu.fileclass-icon") as HTMLAnchorElement
    if (!button) throw Error("button not found")
    plugin.testRunner.planActionAfterFieldsModalBuilt(file, async () => { await insertMissingFields(plugin, file, speed) })
    button.click()
}

async function insertMissingFields(plugin: MetadataMenu, file: TFile, speed = 100) {
    const modal = document.querySelector(".modal-container.metadata-menu.note-fields-modal") as HTMLDivElement
    if (!modal) throw Error("Fields Modal not found")
    const insertFieldsInFrontmatterBtn = modal.querySelector("button.in-frontmatter-btn") as HTMLButtonElement
    if (!insertFieldsInFrontmatterBtn) throw Error("Insert missing fields in frontmatter button not found")
    plugin.testRunner.planActionAfterFieldsModalBuilt(file, () => {
        //modal build is triggered twice after inserting fields
        plugin.testRunner.planActionAfterFieldsModalBuilt(file, async () => {
            await testNumberFieldAction(plugin, modal, speed)
            //manually clean the runner
            plugin.testRunner.nextActionAfterFieldsModal = () => { }
            plugin.testRunner.waitingForModalForFilePath = undefined
        }, false)
    }, false)
    insertFieldsInFrontmatterBtn.click()
}

async function testNumberFieldAction(plugin: MetadataMenu, modal: HTMLDivElement, speed = 100) {
    console.log(modal.innerText)
}