import MetadataMenu from "main"
import { TFile } from "obsidian"
import { Field, isFieldStyle } from "src/fields/Field"
import { getFieldSettingsTest } from "src/fields/Fields"
import { BaseOptions } from "src/fields/base/BaseField"
import { ISettingsModal, areFieldSettingsEqualWithoutId, openSettings } from "src/fields/base/BaseSetting"
import { FileClass } from "src/fileClass/fileClass"
import { isPresetFieldsSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { MetadataMenuSettings, UnboundField } from "src/settings/MetadataMenuSettings"
import { FieldStyleLabel, fieldDecorations } from "src/types/dataviewTypes"
import { setTimeout } from "timers/promises"
import { openPluginSettings } from "../runner"

function getPresetFields(plugin: MetadataMenu, speed = 100): Field[] | void {
    const presetFieldsFile = plugin.app.vault.getAbstractFileByPath("__fixtures__/settings/presetFields.md")
    if (!presetFieldsFile || !(presetFieldsFile instanceof TFile)) return plugin.testRunner.log("ERROR", "Couldn't find preset fields File settings")
    const fields = plugin.app.metadataCache.getFileCache(presetFieldsFile)?.frontmatter?.["fields"] || []
    return fields
}

export async function testPresetFieldsCreation(plugin: MetadataMenu, speed = 100): Promise<ISettingsModal<BaseOptions> | undefined | void> {
    const tab = await openPluginSettings(plugin, speed)
    const presetfields = tab.groups.find(g => g.id === "preset-fields-settings")
    if (!presetfields || !isPresetFieldsSettingGroup(presetfields)) return plugin.testRunner.log("ERROR", "Preset fields setting is undefined")
    await setTimeout(speed)
    presetfields.settingsContainerShowButton.buttonEl.click()
    plugin.testRunner.log("SUCCESS", "Opening preset fields")
    const fields = getPresetFields(plugin)
    if (!fields) return plugin.testRunner.log("ERROR", "Preset fields not found")
    for (const field of fields) {
        field.plugin = plugin
        await enterFieldSettings(field, tab.fieldsContainer, undefined, speed)
    }
    plugin.app.setting.close()
    return
}

export async function enterFieldSettings(field: Field, container?: HTMLDivElement, fileClass?: FileClass, speed = 100) {
    const plugin = field.plugin
    const fieldModal = openSettings("", fileClass?.name, field.plugin, undefined, container)
    if (!fieldModal) return plugin.testRunner.log("ERROR", "Couldn't build new field modal")
    //input the name of the field
    await setTimeout(speed)
    fieldModal.namePromptComponent.setValue(field.name)
    await setTimeout(speed)
    //open type selector modal
    const typeBtn = fieldModal.containerEl.querySelector('#field-type-selector-btn') as HTMLButtonElement
    if (!typeBtn) return plugin.testRunner.log("ERROR", "Type selector button not found")
    typeBtn.click()
    fieldModal.typeSelector.open()
    await setTimeout(speed)
    //check that the type is present
    const type = fieldModal.typeSelector.resultContainerEl.querySelector(`.field-type-${field.type}`) as HTMLDivElement
    if (!type) return plugin.testRunner.log("ERROR", `${type} type not found in type selector modal`)
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
        if (!fileClass) return plugin.testRunner.log("ERROR", `${_field.fileClassName} not found in index`)
        const file = fileClass.getClassFile()
        savedField = (plugin.app.metadataCache.getFileCache(file)?.frontmatter?.fields || [])
            .find((f: Field) => f.name === _field.name && f.path === _field.path)
    } else {
        const presetFields = (await fieldModal.plugin.loadData() as MetadataMenuSettings).presetFields
        savedField = presetFields.find(f => f.name === _field.name)
    }
    if (!savedField) return plugin.testRunner.log("ERROR", `${_field.name} not saved`)
    const STATUS = areFieldSettingsEqualWithoutId(savedField as Field, field) ? "SUCCESS" : "ERROR"
    plugin.testRunner.log(STATUS, `Field ${_field.name} creation`)
}