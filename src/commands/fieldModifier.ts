import MetadataMenu from "main";
import { getField } from "src/commands/getField";
import Field from "src/fields/Field";
import { createFileClass } from "src/fileClass/fileClass";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { FieldManager as F } from "src/fields/FieldManager";

export async function fieldModifier(plugin: MetadataMenu, dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }): Promise<HTMLElement> {

    /* fieldContainer*/
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", "metadata-menu-dv-field-container")

    /* create fieldModifier depending on fileClass type or preset value*/

    if (p[fieldName] === undefined) {
        const emptyField = dv.el("span", null, attrs);
        fieldContainer.appendChild(emptyField);
    } else {
        const fileClassAlias = plugin.settings.fileClassAlias;
        if (p[fileClassAlias]) {
            const fileClass = await createFileClass(plugin, p[fileClassAlias]);
            const field = getField(plugin, fieldName, fileClass);
            if (field?.type) {
                const fieldManager = new FieldManager[field.type](field);
                await fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            } else {
                const fieldManager = F.createDefault(fieldName);
                await fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            }
        } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
            const field = getField(plugin, fieldName)
            if (field?.type) {
                const fieldManager = new FieldManager[field.type](field);
                await fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            } else {
                const fieldManager = F.createDefault(fieldName);
                await fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            }
        } else {
            const fieldManager = F.createDefault(fieldName);
            await fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
        }
    }
    return fieldContainer
}; 