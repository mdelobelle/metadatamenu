import MetadataMenu from "main";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { FieldManager as F } from "src/fields/FieldManager";
import chooseSectionModal from "src/modals/chooseSectionModal";
import { setIcon, TFile } from "obsidian";
import { fieldValueManager } from "src/fields/Field";
import { createDvField as _createDvField } from "src/fields/Fields";
import { positionIcon } from "src/note/line";

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
                asBlockquote: boolean
            ) => F.openFieldModal(
                plugin,
                file,
                fieldName,
                lineNumber,
                asList,
                asBlockquote
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
    const field = plugin.fieldIndex.filesFields.get(p.file.path)?.filter(f => f.isRoot()).find(field => field.name === fieldName)
    if (!field?.isRoot()) {
        /*
        field modifiers are only available for root fields
        */
        dv.el('span', p[field!.name], attrs);
        return
    }
    if (field?.type) {
        if ([FieldType.Media, FieldType.MultiMedia, FieldType.MultiFile, FieldType.File, FieldType.Input, FieldType.Multi, FieldType.Select].includes(field.type)) {
            const target = plugin.app.vault.getAbstractFileByPath(p.file.path) as TFile
            const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, target, undefined)
            _createDvField(fieldVM, dv, p, fieldContainer)
        } else {
            const fieldManager = new FieldManager[field.type](plugin, field);
            fieldManager.createDvField(dv, p, fieldContainer, attrs);
        }
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
            setIcon(addFieldBtn, positionIcon.inline)
            addFieldBtn.onclick = async () => {
                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    const field = plugin.fieldIndex.filesFields.get(file.path)?.filter(f => f.isRoot()).find(field => field.name === fieldName)
                    if (field) {
                        buildAndOpenModal(plugin, file, fieldName, attrs)
                    } else {
                        new chooseSectionModal(plugin, file,
                            (lineNumber: number, asList: boolean, asBlockquote: boolean) => F.openFieldModal(
                                plugin, file, undefined, lineNumber, asList, asBlockquote
                            ),
                        ).open();
                    }
                } else {
                    throw Error("path doesn't correspond to a proper file");
                }
            }
            fieldContainer.appendChild(addFieldBtn);
            const addInFrontmatterFieldBtn = dv.el("button", attrs);
            setIcon(addInFrontmatterFieldBtn, positionIcon.yaml)
            addInFrontmatterFieldBtn.onclick = async () => {
                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    const field = plugin.fieldIndex.filesFields.get(file.path)?.filter(f => f.isRoot()).find(field => field.name === fieldName)
                    if (field) F.openFieldModal(plugin, file, field.name, -1, false, false)
                } else {
                    throw Error("path doesn't correspond to a proper file");
                }
            }
            fieldContainer.appendChild(addInFrontmatterFieldBtn);
        }
    } else {
        const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
        if (file instanceof TFile && file.extension == "md") {
            const field = plugin.fieldIndex.filesFields.get(file.path)?.filter(f => f.isRoot()).find(field => field.name === fieldName)
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