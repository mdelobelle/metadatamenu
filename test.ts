import MetadataMenu from "main"
import { TFile } from "obsidian"
import { openSettings } from "src/fields/base/BaseSetting"
import { isMetadataMenuSettingTab, isPresetFieldsSettingGroup } from "src/settings/MetadataMenuSettingTab"
import { setTimeout } from "timers/promises"

export async function run(plugin: MetadataMenu) {
    console.log("testing")
    openSettingTab(plugin)

}
export async function openSettingTab(plugin: MetadataMenu) {
    await setTimeout(2000)
    const app = plugin.app
    const setting = app.setting
    setting.open()
    await setTimeout(500)
    const mdmSettingTab = setting.pluginTabs.find(p => p.id === "metadata-menu")
    if (!mdmSettingTab || !isMetadataMenuSettingTab(mdmSettingTab)) throw Error("Metadatamenu setting tab is undefined")
    mdmSettingTab.navEl.click()
    await setTimeout(500)
    const presetfields = mdmSettingTab.groups.find(g => g.id === "preset-fields-settings")
    if (!presetfields || !isPresetFieldsSettingGroup(presetfields)) throw Error("Preset fields setting is undefined")
    await setTimeout(2000)
    presetfields.settingsContainerShowButton.buttonEl.click()
    // presetfields.addNewButton.buttonEl.click()

    const newFieldModal = openSettings("", undefined, plugin, undefined, mdmSettingTab.fieldsContainer)
    await setTimeout(2000)
    if (!newFieldModal) throw Error("Couldn't build new field modal")
    newFieldModal.close()
    await setTimeout(1000)
    setting.close()
    await setTimeout(1000)
    // const workbench = plugin.app.vault.getAbstractFileByPath("workbench.md")
    // if (!(workbench instanceof TFile)) throw Error("Workbench file not found")
    // await plugin.app.vault.modify(workbench, "Hello world")
}


export function createPresetField() {

}