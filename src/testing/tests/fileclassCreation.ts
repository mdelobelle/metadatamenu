import MetadataMenu from "main"
import { TFile } from "obsidian"
import { testFileClassSettingsView } from "src/fileClass/views/fileClassSettingsView"
import { testFileClassViewNavigation } from "src/fileClass/views/fileClassView"
import { isFileClassSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { setTimeout } from "timers/promises"
import { openPluginSettings } from "../runner"

export const fileClassFolder = "Fileclasses"
export const fileclassFixtures = "__fixtures__/fileClasses"


export async function testFileClassesCreation(plugin: MetadataMenu, speed = 100): Promise<void> {
    const tab = await openPluginSettings(plugin)
    const fileClassSettings = tab.groups.find(g => g.id === "fileclass-settings")
    if (!fileClassSettings || !isFileClassSettingGroup(fileClassSettings)) return plugin.testRunner.log("ERROR", "Fileclass setting group is undefined")
    await setTimeout(speed)
    // fileclass folder settings
    fileClassSettings.settingsContainerShowButton.buttonEl.click()
    plugin.testRunner.insertInTextComponent(fileClassSettings.fileClassPathInput, fileClassFolder)
    fileClassSettings.fileClassesFolderSaveButton.buttonEl.click()
    plugin.app.setting.close()
    const fileclasses = plugin.app.vault.getFiles()
        .filter(f => f.parent?.path === fileclassFixtures)
        //Fileclass1.md has to be created before Fileclass2.md for inheritance testing
        .sort((f1, f2) => f1.name < f2.basename ? -1 : 1)
    const addFileClassBtn = document.querySelector(".fileClass-add-button") as HTMLDivElement
    if (!addFileClassBtn) return plugin.testRunner.log("ERROR", "Fileclass add button not found")
    for (const fileclass of fileclasses) {
        await testCreateFileClass(plugin, addFileClassBtn, fileclass, speed)
    }
}

async function testCreateFileClass(plugin: MetadataMenu, addBtn: HTMLDivElement, fileClassDataFile: TFile, speed = 100) {
    const fileClassName = fileClassDataFile.basename
    addBtn.click()
    const modal = document.querySelector("#add-new-fileclass-modal")
    if (!modal) return plugin.testRunner.log("ERROR", "Add new fileclass modal not found")
    const input = modal.querySelector("#fileclass-name-input") as HTMLInputElement
    if (!input) return plugin.testRunner.log("ERROR", "fileclass name input not found")
    plugin.testRunner.insertInInputEl(input, fileClassDataFile.basename)
    await setTimeout(1000) // because input is async in this form
    const saveBtn = modal.querySelector("#new-fileclass-confirm-btn") as HTMLDivElement
    saveBtn.dispatchEvent(new Event("click"));
    (modal.querySelector(".modal-close-button") as HTMLDivElement).click();
    await setTimeout(5000) // because save is async in this form
    const fileClass = plugin.fieldIndex.fileClassesName.get(fileClassName)
    //clear frontmatterCache for this file to avoid conflict with previous test runs
    if (!fileClass) return plugin.testRunner.log("ERROR", `${fileClassName} wasn't create or indexed`)
    await testFileClassViewNavigation(plugin, fileClass, speed)
    const data = plugin.app.metadataCache.getFileCache(fileClassDataFile)?.frontmatter
    if (!data) return plugin.testRunner.log("ERROR", `${fileClassDataFile.basename} fixture data not found`)
    await testFileClassSettingsView(plugin, fileClass, data, speed)
}

