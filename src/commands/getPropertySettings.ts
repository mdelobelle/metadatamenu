import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FileClass } from "src/fileClass/fileClass";

export function getPropertySettings(plugin: MetadataMenu, propertyName: string, fileClass?: FileClass): Field | undefined {
    const matchingSettings = plugin.settings.presetFields.filter(p => p.name == propertyName);
    if (fileClass) {
        const fileClassAttributesWithName = fileClass.attributes.filter(attr => attr.name == propertyName);
        if (fileClassAttributesWithName.length > 0) {
            const fileClassAttribute = fileClassAttributesWithName[0];
            if (fileClassAttribute.type) {
                return fileClassAttribute.getField();
            } else if (matchingSettings.length > 0) {
                return matchingSettings[0];
            };
        }
    } else if (matchingSettings.length > 0) {
        return matchingSettings[0];
    };
};