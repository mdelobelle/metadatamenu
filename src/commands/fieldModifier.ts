import MetadataMenu from "main";
import { FieldManager } from "src/types/fieldTypes";
import { FieldManager as F } from "src/fields/FieldManager";
import chooseSectionModal from "src/modals/chooseSectionModal";
import { setIcon, TFile } from "obsidian";

function buildAndOpenModal(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    if (attrs?.options?.inFrontmatter) {
        const lineNumber = - 1
        F.openFieldModal(plugin, file, fieldName, lineNumber, false, false)
    } else {
        new chooseSectionModal(
            plugin,
            file,
            (
                lineNumber: number,
                asList: boolean,
                asComment: boolean
            ) => F.openFieldModal(
                plugin,
                file,
                fieldName,
                lineNumber,
                asList,
                asComment
            )
        ).open();
    }
}

function createDvField(
    plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    fieldName: string,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    const field = plugin.fieldIndex.filesFields.get(p.file.path)?.find(field => field.name === fieldName)
    if (!field?.isRoot()) {
        /*
        field modifiers are only available for root fields
        */
        dv.el('span', p[field!.name], attrs);
        return
    }
    if (field?.type) {
        const fieldManager = new FieldManager[field.type](plugin, field);
        fieldManager.createDvField(dv, p, fieldContainer, attrs);
    } else {
        const fieldManager = F.createDefault(plugin, fieldName);
        fieldManager.createDvField(dv, p, fieldContainer, attrs);
    }
}

export function fieldModifier(
    plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldName: string,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): HTMLElement {
    /* fieldContainer*/
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", `metadata-menu-dv-field-container ${fieldName}`)

    /* create fieldModifier depending on fileClass type or preset value*/

    if (p[fieldName] === undefined) {
        if (!attrs?.options?.showAddField) {
            const emptyField = dv.el("span", null, attrs);
            fieldContainer.appendChild(emptyField);
        } else {
            const addFieldBtn = dv.el("button", attrs);
            setIcon(addFieldBtn, "plus-with-circle")
            addFieldBtn.onclick = async () => {

                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    const field = plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === fieldName)
                    if (field) {
                        buildAndOpenModal(plugin, file, fieldName, attrs)
                    } else {
                        new chooseSectionModal(
                            plugin,
                            file,
                            (
                                lineNumber: number,
                                asList: boolean,
                                asComment: boolean
                            ) => F.openFieldModal(
                                plugin,
                                file,
                                undefined,
                                lineNumber,
                                asList,
                                asComment
                            ),
                        ).open();
                    }
                } else {
                    throw Error("path doesn't correspond to a proper file");
                }
            }
            fieldContainer.appendChild(addFieldBtn);
        }
    } else {
        const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
        if (file instanceof TFile && file.extension == "md") {
            const field = plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === fieldName)
            if (field) {
                createDvField(plugin, dv, p, fieldContainer, fieldName, attrs)
            } else {
                const fieldManager = F.createDefault(plugin, fieldName);
                fieldManager.createDvField(dv, p, fieldContainer, attrs);
            }
        }
    }
    return fieldContainer
}; 