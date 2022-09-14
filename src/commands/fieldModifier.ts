import MetadataMenu from "main";
import { getField } from "src/commands/getField";
import { FileClass } from "src/fileClass/fileClass";
import { FieldManager } from "src/types/fieldTypes";
import { FieldManager as F } from "src/fields/FieldManager";
import chooseSectionModal from "src/optionModals/chooseSectionModal";
import { setIcon, TFile } from "obsidian";
import FileClassQuery from "src/fileClass/FileClassQuery";


function getQueryFileClassForFields(plugin: MetadataMenu, file: TFile): FileClass | undefined {
    let fileClassForFields = false;
    let fileClass: FileClass | undefined;
    const fileClassQueries = plugin.settings.fileClassQueries.map(fcq => fcq)
    while (!fileClassForFields && fileClassQueries.length > 0) {
        const fileClassQuery = new FileClassQuery(plugin);
        Object.assign(fileClassQuery, fileClassQueries.pop() as FileClassQuery)
        if (fileClassQuery.matchFile(file)) {
            fileClassForFields = true;
            fileClass = FileClass.createFileClass(plugin, fileClassQuery.fileClassName)
        }
    }
    return fileClass
}

function buildAndOpenModal(
    plugin: MetadataMenu,
    file: TFile,
    fieldName: string,
    fileClass?: FileClass,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    if (attrs?.options?.inFrontmatter && plugin.app.metadataCache.getCache(file.path)?.frontmatter) {
        const lineNumber = plugin.app.metadataCache.getCache(file.path)!.frontmatter!.position.end.line - 1
        F.openFieldModal(plugin, file, fieldName, "", lineNumber, true, false, fileClass)
    } else {
        new chooseSectionModal(plugin, file, fileClass, fieldName).open();
    }
}

function createDvField(plugin: MetadataMenu,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    fieldName: string,
    fileClass?: FileClass,
    attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
): void {
    const field = getField(plugin, fieldName, fileClass);
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
    fieldContainer.setAttr("class", "metadata-menu-dv-field-container")

    /* create fieldModifier depending on fileClass type or preset value*/

    if (p[fieldName] === undefined) {
        if (!attrs?.options?.showAddField) {
            const emptyField = dv.el("span", null, attrs);
            fieldContainer.appendChild(emptyField);
        } else {
            const addFieldBtn = dv.el("button", attrs);
            setIcon(addFieldBtn, "plus-with-circle")
            addFieldBtn.addClass("metadata-menu-dv-field-button");
            addFieldBtn.addClass("isolated");
            addFieldBtn.onclick = async () => {

                const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    const fileClassAlias = plugin.settings.fileClassAlias;
                    const queryFileClass = getQueryFileClassForFields(plugin, file)
                    if (p[fileClassAlias]) {
                        const fileClassName = p[fileClassAlias] as string
                        const fileClass = FileClass.createFileClass(plugin, fileClassName);
                        buildAndOpenModal(plugin, file, fieldName, fileClass, attrs)
                    } else if (queryFileClass) {
                        buildAndOpenModal(plugin, file, fieldName, queryFileClass, attrs)
                    } else if (plugin.settings.globalFileClass) {
                        const fileClassName = plugin.settings.globalFileClass
                        const fileClass = FileClass.createFileClass(plugin, fileClassName);
                        buildAndOpenModal(plugin, file, fieldName, fileClass, attrs)
                    } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
                        const field = getField(plugin, fieldName);
                        if (field?.type) {
                            buildAndOpenModal(plugin, file, fieldName, undefined, attrs)
                        } else {
                            new chooseSectionModal(plugin, file, undefined).open();
                        }
                    } else {
                        new chooseSectionModal(plugin, file, undefined).open();
                    }
                } else {
                    throw Error("path doesn't correspond to a proper file");
                }

            }
            fieldContainer.appendChild(addFieldBtn);
        }
    } else {
        const fileClassAlias = plugin.settings.fileClassAlias;
        const file = plugin.app.vault.getAbstractFileByPath(p.file.path)
        if (file instanceof TFile && file.extension == "md") {
            const queryFileClass = getQueryFileClassForFields(plugin, file)
            if (p[fileClassAlias]) {
                const fileClassName = p[fileClassAlias] || plugin.settings.globalFileClass // inner fileClass has the priority over global fileClass
                const fileClass = FileClass.createFileClass(plugin, fileClassName);
                createDvField(plugin, dv, p, fieldContainer, fieldName, fileClass, attrs)
            } else if (queryFileClass) {
                createDvField(plugin, dv, p, fieldContainer, fieldName, queryFileClass, attrs)
            } else if (plugin.settings.globalFileClass) {
                const fileClassName = plugin.settings.globalFileClass // inner fileClass has the priority over global fileClass
                const fileClass = FileClass.createFileClass(plugin, fileClassName);
                createDvField(plugin, dv, p, fieldContainer, fieldName, fileClass, attrs)
            } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
                createDvField(plugin, dv, p, fieldContainer, fieldName, undefined, attrs)
            } else {
                const fieldManager = F.createDefault(plugin, fieldName);
                fieldManager.createDvField(dv, p, fieldContainer, attrs);
            }
        }
    }
    return fieldContainer
}; 