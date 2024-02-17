import MetadataMenu from "main"
import { MarkdownView, TFile } from "obsidian"
import { Field } from "src/fields/Field"
import { BaseOptions } from "src/fields/base/BaseField"
import { BaseValueModal } from "src/fields/base/BaseModal"
import { Note } from "src/note/note"

export const testFilePath = "Folder3/test3_1_fileclass_frontmatter.md"
export const numberTest = {
    name: "push-ups",
    value: 10
}
export const inputTest = {
    name: "calories",
    value: "test"
}

export async function testValueModification(plugin: MetadataMenu, speed = 100) {
    await testMetadataMenuButton(plugin, speed)
}

async function testMetadataMenuButton(plugin: MetadataMenu, speed = 100) {
    const test3_1 = plugin.app.vault.getAbstractFileByPath(testFilePath)
    if (!test3_1) return plugin.testRunner.log("ERROR", testFilePath + " not found")
    await plugin.app.workspace.openLinkText(test3_1.path, test3_1.path)
    const leaf = plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if (!leaf?.file || !(leaf.file instanceof TFile) || leaf.file.path !== testFilePath) return plugin.testRunner.log("ERROR", "Active pane isn't test3_1")
    const addFileClassCommand = plugin.app.commands.commands["metadata-menu:add_fileclass_to_file"]
    if (!addFileClassCommand || !addFileClassCommand.checkCallback) return plugin.testRunner.log("ERROR", "AddFileClass command not found")
    addFileClassCommand.checkCallback(false)
    const fileClassName = "Fileclass1"
    const choice = document.querySelector(`#fileclass-${fileClassName}-add-choice`) as HTMLDivElement
    if (!choice) return plugin.testRunner.log("ERROR", "Fileclass choice not found")
    plugin.testRunner.planActionAfterMetadataCacheResolution(async () => {
        await checkFileClass(plugin, leaf.file!, fileClassName, speed)
    })
    choice.click()
}

async function checkFileClass(plugin: MetadataMenu, file: TFile, fileClassName: string, speed = 100) {
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter
    if (frontmatter?.["fileClass"] === fileClassName) plugin.testRunner.log("SUCCESS", "Adding FileClass to file")
    plugin.testRunner.planActionAfterButtonBuilt(
        file.path.replace(/\.md$/, ""),
        "tabHeader",
        fileClassName,
        async () => { await openFieldsModal(plugin, file, speed) }
    )
}

async function openFieldsModal(plugin: MetadataMenu, file: TFile, speed = 100) {
    const tab = document.querySelector(".workspace-tab-header[aria-label=test3_1_fileclass_frontmatter]")
    if (!tab) return plugin.testRunner.log("ERROR", "tab not found")
    const button = tab.querySelector("a.metadata-menu.fileclass-icon") as HTMLAnchorElement
    if (!button) return plugin.testRunner.log("ERROR", "button not found")
    plugin.testRunner.planActionAfterFieldsModalBuilt(
        file,
        async () => { await insertMissingFields(plugin, file, speed) }
    )
    button.click()
}

async function insertMissingFields(plugin: MetadataMenu, file: TFile, speed = 100) {
    const modal = document.querySelector(".modal-container.metadata-menu.note-fields-modal") as HTMLDivElement
    if (!modal) return plugin.testRunner.log("ERROR", "Fields Modal not found")
    const insertFieldsInFrontmatterBtn = modal.querySelector("button.in-frontmatter-btn") as HTMLButtonElement
    if (!insertFieldsInFrontmatterBtn) return plugin.testRunner.log("ERROR", "Insert missing fields in frontmatter button not found")
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
    const numberField = plugin.fieldIndex.filesFields.get(testFilePath)?.find(f => f.name === numberTest.name)
    if (!numberField) return plugin.testRunner.log("ERROR", `${numberTest.name} field not found`)
    const incrementBtn = modal.querySelector(`#field_${numberField.id}_increase`) as HTMLDivElement
    if (!incrementBtn) return plugin.testRunner.log("ERROR", `${numberField.name} increment button not found`)
    plugin.testRunner.planActionAfterFieldIndex(() => { getNumberFieldResultAndTestInputField(plugin, numberField, modal, speed) })
    incrementBtn.click()
}

async function getNumberFieldResultAndTestInputField(plugin: MetadataMenu, numberField: Field, modal: HTMLDivElement, speed = 100) {
    const file = plugin.app.vault.getAbstractFileByPath(testFilePath)
    if (!(file instanceof TFile)) return plugin.testRunner.log("ERROR", testFilePath + " file not found")
    const note = await Note.buildNote(plugin, file)
    const test = note.existingFields.find(eF => eF.field.id === numberField.id)?.value === numberField.options.step
    plugin.testRunner.log(test ? "SUCCESS" : "ERROR", "Number field action from fields modal")
    const input = plugin.fieldIndex.filesFields.get(testFilePath)?.find(f => f.name === inputTest.name)
    if (!input) return plugin.testRunner.log("ERROR", `${inputTest.name} field not found`)
    const updateBtn = modal.querySelector(`#field_${input.id}_update`) as HTMLDivElement
    if (!updateBtn) return plugin.testRunner.log("ERROR", `${input.name} increment button not found`)
    plugin.testRunner.planActionAfterFieldUpdateModalBuilt(input.id, (modal) => { testInputModal(plugin, input, modal, speed) })
    updateBtn.click()
}

async function testInputModal(plugin: MetadataMenu, input: Field, inputModal: BaseValueModal<TFile, BaseOptions>, speed = 100) {
    const modal = document.querySelector(`#field_${input.id}_update_modal`)
    if (!modal) return plugin.testRunner.log("ERROR", `${input.name} update modal not found`)
    const textArea = modal.querySelector("textarea") as HTMLTextAreaElement
    if (!textArea) return plugin.testRunner.log("ERROR", `${input.name} text area not found`)
    plugin.testRunner.insertInInputEl(textArea, inputTest.value)
    plugin.testRunner.planActionAfterFieldIndex(() => {
        testInputUpdate(plugin, input, speed)
    })
    inputModal.managedField.save()
    inputModal.close()
}

async function testInputUpdate(plugin: MetadataMenu, input: Field, speed = 100) {
    const file = plugin.app.vault.getAbstractFileByPath(testFilePath)
    if (!(file instanceof TFile)) return plugin.testRunner.log("ERROR", testFilePath + " file not found")
    const note = await Note.buildNote(plugin, file)
    const test = note.existingFields.find(eF => eF.field.id === input.id)?.value === inputTest.value
    plugin.testRunner.log(test ? "SUCCESS" : "ERROR", "Input field action from fields modal")
    const modal = document.querySelector(".modal-container.metadata-menu.note-fields-modal") as HTMLDivElement
    if (!modal) return plugin.testRunner.log("ERROR", "Fields Modal not found");
    (modal.querySelector(".modal-close-button") as HTMLDivElement).click()
}