import MetadataMenu from "main";
import { migratedFieldTypes } from "src/types/fieldTypes";
import chooseSectionModal from "src/modals/chooseSectionModal";
import { setIcon, TFile } from "obsidian";
import { buildField, FieldValueManager, fieldValueManager } from "src/fields/Field";
import { createDvField as _createDvField, mapFieldType, mapLegacyFieldType } from "src/fields/Fields";
import { positionIcon } from "src/note/line";
import GField from "src/fields/_Field"

function buildAndOpenModal(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    const field: GField | undefined = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.isRoot() && f.name === fieldName)
    if (field) {
        if (attrs?.options?.inFrontmatter) {
            const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, undefined, undefined, -1)
            fieldVM?.openModal()
        } else {
            new chooseSectionModal(
                plugin,
                file,
                (
                    lineNumber: number,
                    asList: boolean,
                    asBlockquote: boolean
                ) => {
                    const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, undefined, undefined, lineNumber, asList, asBlockquote)
                    fieldVM?.openModal()
                }
            ).open();
        }
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
        if (migratedFieldTypes.includes(field.type)) {
            const target = plugin.app.vault.getAbstractFileByPath(p.file.path) as TFile
            const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, target, undefined)
            _createDvField(fieldVM, dv, p, fieldContainer)
        } else {
            console.error("Not implemented")

        }
    } else {
        const field = buildField(plugin, fieldName, "", "", undefined, undefined, undefined, undefined, "Input", {});
        const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
        if (file instanceof TFile) {
            const fieldVM = new (FieldValueManager(plugin, field, file, undefined))
            _createDvField(fieldVM, dv, p, fieldContainer, attrs)
        }
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
                            (lineNumber: number, asList: boolean, asBlockquote: boolean) => {
                                const field = buildField(plugin, fieldName, "", "", undefined, undefined, undefined, undefined, "Input", {});
                                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                                if (file instanceof TFile) {
                                    const fieldVM = new (FieldValueManager(plugin, field, file, undefined, undefined, lineNumber, asList, asBlockquote))
                                    fieldVM?.openModal()
                                }
                            },
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
                    if (field) {
                        const _field = buildField(plugin, field.name, field.id, field.path, field.fileClassName, field.command, field.display, field.style, field.type, {})
                        const fieldVM = new (FieldValueManager(plugin, _field, file, undefined, undefined, -1, false, false))
                        fieldVM?.openModal()
                    }
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
                const field = buildField(plugin, fieldName, "", "", undefined, undefined, undefined, undefined, "Input", {});
                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile) {
                    const fieldVM = new (FieldValueManager(plugin, field, file, undefined))
                    _createDvField(fieldVM, dv, p, fieldContainer, attrs)
                }
            }
        }
    }
    return fieldContainer
}; 