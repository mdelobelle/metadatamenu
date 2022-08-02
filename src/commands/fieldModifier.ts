import MetadataMenu from "main"
import { createFileClass } from "src/fileClass/fileClass";
import { getPropertySettings } from "src/commands/getPropertySettings";
import { FieldType } from "src/types/fieldTypes";
import Managers from "src/fields/fieldManagers/Managers";
import { createInputField } from "./createInputField";


export async function fieldModifier(plugin: MetadataMenu, dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }): Promise<HTMLElement> {

    /* fieldContainer*/
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", "metadata-menu-dv-field-container")

    /* create fieldModifier depending on fileClass type or preset value*/

    if (p[fieldName] === undefined) {
        const emptyField = dv.el("span", null, attrs)
        fieldContainer.appendChild(emptyField)
    } else {
        const fileClassAlias = plugin.settings.fileClassAlias
        if (p[fileClassAlias]) {
            const fileClass = await createFileClass(plugin, p[fileClassAlias])
            const field = getPropertySettings(plugin, fieldName, fileClass)
            if (field?.type === FieldType.Boolean) {
                const fieldManager = new Managers.Boolean(field);
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs)
            } else if (field?.type === FieldType.Input) {
                const fieldManager = new Managers.Input(field);
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs)
            } else {
                createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
            }
        } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
            const field = getPropertySettings(plugin, fieldName)
            if (field?.type === FieldType.Boolean) {
                const fieldManager = new Managers.Boolean(field);
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs)
            } else if (field?.type === FieldType.Input) {
                const fieldManager = new Managers.Input(field);
                fieldManager.createDvField(plugin, dv, p, fieldContainer, attrs)
            } else {
                createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
            }
        } else {
            createInputField(plugin, dv, p, fieldName, fieldContainer, attrs)
        }
    }
    return fieldContainer
}; 