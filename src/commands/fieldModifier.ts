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

export async function fieldModifier(plugin: MetadataMenu, dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }): Promise<HTMLElement> {

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
                        const fileClassName = p[fileClassAlias]
                        const fileClass = FileClass.createFileClass(plugin, fileClassName);
                        if (attrs?.options?.inFrontmatter && plugin.app.metadataCache.getCache(file.path)?.frontmatter) {
                            const lineNumber = plugin.app.metadataCache.getCache(file.path)!.frontmatter!.position.end.line - 1
                            F.openFieldModal(plugin, file, fieldName, "", lineNumber, true, false, fileClass)
                        } else {
                            new chooseSectionModal(plugin, file, fileClass, fieldName).open();
                        }
                    } else if (queryFileClass) {
                        if (attrs?.options?.inFrontmatter && plugin.app.metadataCache.getCache(file.path)?.frontmatter) {
                            const lineNumber = plugin.app.metadataCache.getCache(file.path)!.frontmatter!.position.end.line - 1
                            F.openFieldModal(plugin, file, fieldName, "", lineNumber, true, false, queryFileClass)
                        } else {
                            new chooseSectionModal(plugin, file, queryFileClass, fieldName).open();
                        }

                    } else if (plugin.settings.globalFileClass) {
                        const fileClassName = plugin.settings.globalFileClass
                        const fileClass = FileClass.createFileClass(plugin, fileClassName);
                        if (attrs?.options?.inFrontmatter && plugin.app.metadataCache.getCache(file.path)?.frontmatter) {
                            const lineNumber = plugin.app.metadataCache.getCache(file.path)!.frontmatter!.position.end.line - 1
                            F.openFieldModal(plugin, file, fieldName, "", lineNumber, true, false, fileClass)
                        } else {
                            new chooseSectionModal(plugin, file, fileClass, fieldName).open();
                        }
                    } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
                        const field = getField(plugin, fieldName);
                        if (field?.type) {
                            if (attrs?.options?.inFrontmatter && plugin.app.metadataCache.getCache(file.path)?.frontmatter) {
                                const lineNumber = plugin.app.metadataCache.getCache(file.path)!.frontmatter!.position.end.line - 1
                                F.openFieldModal(plugin, file, fieldName, "", lineNumber, true, false)
                            } else {
                                new chooseSectionModal(plugin, file, undefined, fieldName).open();
                            }
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
        if (p[fileClassAlias] || plugin.settings.globalFileClass) {
            const fileClassName = p[fileClassAlias] || plugin.settings.globalFileClass // inner fileClass has the priority over global fileClass
            const fileClass = FileClass.createFileClass(plugin, fileClassName);
            const field = getField(plugin, fieldName, fileClass);
            if (field?.type) {
                const fieldManager = new FieldManager[field.type](plugin, field);
                await fieldManager.createDvField(dv, p, fieldContainer, attrs);
            } else {
                const fieldManager = F.createDefault(plugin, fieldName);
                await fieldManager.createDvField(dv, p, fieldContainer, attrs);
            }
        } else if (plugin.settings.presetFields.filter(attr => attr.name == fieldName)) {
            const field = getField(plugin, fieldName)
            if (field?.type) {
                const fieldManager = new FieldManager[field.type](plugin, field);
                await fieldManager.createDvField(dv, p, fieldContainer, attrs);
            } else {
                const fieldManager = F.createDefault(plugin, fieldName);
                await fieldManager.createDvField(dv, p, fieldContainer, attrs);
            }
        } else {
            const fieldManager = F.createDefault(plugin, fieldName);
            await fieldManager.createDvField(dv, p, fieldContainer, attrs);
        }
    }
    return fieldContainer
}; 