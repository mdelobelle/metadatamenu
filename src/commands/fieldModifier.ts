import MetadataMenu from "main";
import chooseSectionModal from "src/modals/chooseSectionModal";
import { setIcon, TFile } from "obsidian";
import { buildField, Field, FieldValueManager, fieldValueManager } from "src/fields/Field";
import { createDvField as _createDvField, getIcon } from "src/fields/Fields";
import { positionIcon } from "src/note/line";
import { displayItem } from "src/fields/models/ObjectList";
import { Note } from "src/note/note";
import { getPseudoObjectValueManagerFromObjectItem } from "src/fields/models/Object";

function buildAndOpenModal(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    const field: Field | undefined = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.isRoot() && f.name === fieldName)
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

export function fieldModifier(
    plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldName: string,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): HTMLElement {
    /* fieldContainer*/
    attrs.cls = attrs?.cls || {} + "value-container"
    const fieldContainer: HTMLElement = dv.el("div", "")
    fieldContainer.setAttr("class", `metadata-menu-dv-field-container ${fieldName}`)

    /* create fieldModifier depending on fileClass type or preset value*/
    const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
    if (!(file instanceof TFile && file.extension == "md")) {
        throw Error("path doesn't correspond to a proper file");
    }
    const { indexedPath, field } = getFullIndexedPathFromDottedPath(fieldName, plugin.fieldIndex.filesFields.get(file.path))

    const fieldSegments = fieldName.replaceAll("[", ".").replaceAll("]", "").split(".")
    const fieldValue = fieldSegments.reduce((acc, cur) => acc?.[cur], p)
    if (fieldValue === undefined) {
        if (!attrs?.options?.showAddField) {
            const emptyField = dv.el("span", null, attrs);
            fieldContainer.appendChild(emptyField);
            return fieldContainer
        }
        const addFieldBtn = dv.el("button", attrs);
        setIcon(addFieldBtn, positionIcon.inline)
        addFieldBtn.onclick = async () => {
            if (field) {
                buildAndOpenModal(plugin, file, fieldName, attrs)
            } else {
                new chooseSectionModal(plugin, file,
                    (lineNumber: number, asList: boolean, asBlockquote: boolean) => {
                        const fieldVM = new (FieldValueManager(plugin, field, file, undefined, indexedPath, lineNumber, asList, asBlockquote))
                        fieldVM?.openModal()
                    },
                ).open();
            }
        }
        fieldContainer.appendChild(addFieldBtn);
        const addInFrontmatterFieldBtn = dv.el("button", attrs);
        setIcon(addInFrontmatterFieldBtn, positionIcon.yaml)
        addInFrontmatterFieldBtn.onclick = async () => {
            if (field) {
                const _field = buildField(plugin, field.name, field.id, field.path, field.fileClassName, field.command, field.display, field.style, field.type, {})
                const fieldVM = new (FieldValueManager(plugin, _field, file, undefined, indexedPath, -1, false, false))
                fieldVM?.openModal()
            }
        }
        fieldContainer.appendChild(addInFrontmatterFieldBtn);
    } else {
        if (field && field?.type) {
            const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, undefined, indexedPath)
            if (!fieldVM) {
                return fieldContainer
            }

            try {
                fieldVM.value = fieldValue
                if (field.type === "ObjectList" && !isNaN(parseInt(fieldSegments.last()!))) {
                    const index = parseInt(fieldSegments.last()!)
                    const editBtn = fieldContainer.createEl("button");
                    const displayValue = (dv.el('span', displayItem(fieldVM, fieldValue, parseInt(fieldSegments.last()!)) || "", attrs) as HTMLDivElement);
                    fieldContainer.appendChild(displayValue);
                    setIcon(editBtn, getIcon("Object"))
                    editBtn.onclick = async () => {
                        const upperObjectListEF = await Note.getExistingFieldForIndexedPath(plugin, file, indexedPath.replace(/\[\d+\]$/, ""))
                        const item = (await upperObjectListEF?.getChildrenFields(fieldVM.plugin, fieldVM.target as TFile) || [])[index]
                        const itemFVM = getPseudoObjectValueManagerFromObjectItem(fieldVM, item)
                        itemFVM.openModal()
                    }
                } else {
                    _createDvField(fieldVM, dv, p, fieldContainer, attrs)
                }
            } catch (error) {
                // @ts-ignore
                console.log(`Error when loading "${fieldVM.target.name}" with field "${fieldVM.name}" with value "${fieldVM.value}"`);
            }

        }
        else {
            try {
                const field = buildField(plugin, fieldName, "", "", undefined, undefined, undefined, undefined, "Input", {});
                const fieldVM = new (FieldValueManager(plugin, field, file, undefined, indexedPath))
                fieldVM.value = fieldValue
                _createDvField(fieldVM, dv, p, fieldContainer, attrs)
            } catch (error) {
                // @ts-ignore
                console.log(`Error when loading "${fieldVM.target.name}" with field "${fieldVM.name}" with value "${fieldVM.value}"`);
            }
        }
    }
    return fieldContainer
};


function getFullIndexedPathFromDottedPath(dottedPath: string, fileFields: Field[] | undefined): { indexedPath: string, field: Field } {
    const dottedFields = dottedPath.replaceAll("[", ".").replaceAll("]", "").split(".")
    var parent = ""
    const fields = []
    for (const field of dottedFields) {
        const f = fileFields?.find(x => x.name === field && x.path === parent)
        if (f) {
            fields.push(f)
            parent = `${f.path}${f.isRoot() ? "" : "____"}${f.id}`
        }
    }
    fields.forEach(x => dottedPath = dottedPath.replaceAll(x.name, x.id))
    return { indexedPath: dottedPath.replaceAll(".", "____"), field: fields[fields.length - 1] }
}
