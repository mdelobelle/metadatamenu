import MetadataMenu from "main"
import Field from "../fields/Field"
import { FieldType } from "src/types/fieldTypes"
import * as selectValuesSource from "../types/selectValuesSourceTypes"

interface V1Field extends Field {
    isMulti?: boolean,
    isCycle?: boolean,
    isBoolean?: boolean,
    values?: Record<string, string>
}

interface V2Field extends Field {
    valuesListNotePath?: string
}

export const migrateSettings = async (plugin: MetadataMenu) => {
    if (plugin.settings.settingsVersion === undefined) await migrateSettingsV1toV2(plugin)
    if (plugin.settings.settingsVersion === 2) await migrateSettingsV2toV3(plugin)
    if (plugin.settings.settingsVersion === 3) await migrateSettingsV3toV4(plugin)
    if (plugin.settings.settingsVersion === 4) await migrateSettingsV4toV5(plugin)
}

export const migrateSettingsV1toV2 = async (plugin: MetadataMenu) => {
    const presetFields = plugin.presetFields
    presetFields.forEach((p: V1Field) => {
        if (!Object.keys(p).contains("type")) {
            if (p.isMulti) p.type = FieldType.Multi
            else if (p.isCycle) p.type = FieldType.Cycle
            else if (p.isBoolean) p.type = FieldType.Boolean
            else if (p.options && Object.keys(p.options).length > 0) p.type = FieldType.Select
            else p.type = FieldType.Input
        }
        //erase isMulti, isCycle, isBoolean if exists
        delete p.isMulti;
        delete p.isCycle;
        delete p.isBoolean
        //rename "values" in "option"
        if (Object.getOwnPropertyDescriptor(p, "values") !== undefined) {
            Object.defineProperty(p, "options",
                Object.getOwnPropertyDescriptor(p, "values")!);
            delete p["values"];
        }
    })
    plugin.settings.settingsVersion = 2
    await plugin.saveData(plugin.settings)
    console.log("Metadata menu settings migrated to version 2")
}

export const migrateSettingsV2toV3 = async (plugin: MetadataMenu) => {
    const presetFields = plugin.presetFields
    presetFields.forEach((p: V2Field) => {
        if ([FieldType.Select, FieldType.Multi].includes(p.type)) {
            //Step0: modify options for Select and MultiSelect
            const currentOptionKeys = Object.keys(p.options);
            p.options.valuesList = {}
            currentOptionKeys.forEach(key => p.options.valuesList[key] = p.options[key])
            //Step1: set the valuesSourceType
            if (p.valuesListNotePath) {
                const selectType = selectValuesSource.Type.ValuesListNotePath;
                p.options.sourceType = selectType;
                p.options[selectValuesSource.Key[selectType]];
            } else {
                p.options.sourceType = selectValuesSource.Type.ValuesList
            }
            //Step2: move valuesListNotePath
            p.options.valuesListNotePath = p.valuesListNotePath
            //Step3: delete legacy options
            currentOptionKeys.forEach(key => delete p.options[key])
            //Step4: populate valuesFromDVQuery option with empty string
            p.options.valuesFromDVQuery = ""
        }
        delete p.valuesListNotePath
    })
    plugin.settings.settingsVersion = 3
    await plugin.saveData(plugin.settings)
    console.log("Metadata menu settings migrated to version 3")
}

export const migrateSettingsV3toV4 = async (plugin: MetadataMenu) => {
    plugin.settings.fileClassExcludedFolders = []
    plugin.settings.settingsVersion = 4
    await plugin.saveData(plugin.settings)
    console.log("Metadata menu settings migrated to version 4")
}


export const migrateSettingsV4toV5 = async (plugin: MetadataMenu) => {
    plugin.settings.fileClassExcludedFolders = []
    plugin.settings.settingsVersion = "5.0"
    await plugin.saveData(plugin.settings)
    console.log("Metadata menu settings migrated to version 5")
}