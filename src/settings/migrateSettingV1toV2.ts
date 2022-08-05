import MetadataMenu from "main"
import Field from "../fields/Field"
import { FieldType } from "src/types/fieldTypes"

interface OldField extends Field {
    isMulti?: boolean,
    isCycle?: boolean,
    isBoolean?: boolean,
    values?: Record<string, string>
}

export const migrateSettingsV1toV2 = async (plugin: MetadataMenu) => {
    const presetFields = plugin.settings.presetFields
    presetFields.forEach((p: OldField) => {
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
    console.log("Metadata menu settings migrated")
}