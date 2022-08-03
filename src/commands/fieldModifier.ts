import MetadataMenu from "main";
import { getField } from "src/commands/getField";
import { createFileClass } from "src/fileClass/fileClass";
import { FieldManager } from "src/types/fieldTypes";

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
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            } else {
                return dv.el('span', p[fieldName], attrs);
            }
        } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
            const field = getField(plugin, fieldName)
            if (field?.type) {
                const fieldManager = new FieldManager[field.type](field);
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs);
            } else {
                return dv.el('span', p[fieldName], attrs);
            }
        } else {
            return dv.el('span', p[fieldName], attrs);
        }
    }
    return fieldContainer
}; 