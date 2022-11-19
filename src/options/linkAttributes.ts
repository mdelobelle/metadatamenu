import { App, getLinkpath, LinkCache, MarkdownPostProcessorContext, MarkdownView, TFile, setIcon } from "obsidian"
import MetadataMenu from "main";
import NoteFieldsComponent from "../components/NoteFields";
import { FileClassManager } from "src/components/fileClassManager";

export function clearExtraAttributes(link: HTMLElement) {
    Object.values(link.attributes).forEach(attr => {
        if (attr.name.includes("fileclass-name")) {
            link.removeAttribute(attr.name)
            const el = link.nextElementSibling
            if (el?.hasClass("fileclass-icon")) {
                el.remove()
            }
        }
    })
}

function setLinkMetadataFormButton(plugin: MetadataMenu, link: HTMLElement, destPath: string, viewTypeName: string | null, fileClassName?: string) {
    switch (viewTypeName) {
        case "a.internal-link": if (!plugin.settings.enableLinks) return; break;
        case "tabHeader": if (!plugin.settings.enableTabHeader) return; break;
        case "starred": if (!plugin.settings.enableStarred) return; break;
        case "file-explorer": if (!plugin.settings.enableFileExplorer) return; break;
        case "backlink": if (!plugin.settings.enableBacklinks) return; break;
        case "search": if (!plugin.settings.enableSearch) return; break;
        default: return;
    }
    // @ts-ignore
    for (const a of link.attributes) {
        if (a.name.includes("fileclass-name") && (a.name !== fileClassName)) {
            link.removeAttribute(a.name);
            const el = link.nextElementSibling
            if (el?.hasClass("fileclass-icon")) {
                el.remove()
            }
        }
    }
    const classFilessPath = plugin.settings.classFilesPath
    const fileClass = plugin.fieldIndex.fileClassesPath.get(destPath + ".md")
    if (classFilessPath && fileClass) {

        const icon = "file-spreadsheet"
        link.setAttribute("fileclass-name", fileClass.name)
        const el = link.nextElementSibling
        if (!el?.hasClass("fileclass-icon")) {
            const metadataMenuBtn = plugin.app.workspace.containerEl.createEl('a', { cls: "metadata-menu fileclass-icon" })
            if (metadataMenuBtn) {
                setIcon(metadataMenuBtn, icon)
                link.parentElement?.insertBefore(metadataMenuBtn, link.nextSibling)
                metadataMenuBtn.onclick = (event) => {
                    plugin.addChild(new FileClassManager(plugin, fileClass))
                    event.stopPropagation();
                }
            }
        }

    }
    else if (fileClassName) {
        const fileClass = plugin.fieldIndex.fileClassesName.get(fileClassName)
        if (fileClass) {
            const icon = fileClass.getIcon()
            link.setAttribute("fileclass-name", fileClassName)
            const el = link.nextElementSibling
            if (!el?.hasClass("fileclass-icon")) {
                const metadataMenuBtn = plugin.app.workspace.containerEl.createEl('a', { cls: "metadata-menu fileclass-icon" })
                if (metadataMenuBtn) {
                    setIcon(metadataMenuBtn, icon || plugin.settings.buttonIcon)
                    link.parentElement?.insertBefore(metadataMenuBtn, link.nextSibling)
                    metadataMenuBtn.onclick = (event) => {
                        const file = plugin.app.vault.getAbstractFileByPath(`${destPath}.md`)
                        if (file instanceof TFile && file.extension === "md") {
                            const noteFieldsComponent = new NoteFieldsComponent(plugin, "1", () => { }, file)
                            plugin.addChild(noteFieldsComponent);
                        }
                        event.stopPropagation();
                    }
                }
            }
        }
    }
}

function updateLinkMetadataMenuFormButton(app: App, plugin: MetadataMenu, link: HTMLElement, viewTypeName: string | null, source: string) {
    const linkHref = link.getAttribute('href')?.split('#')[0];
    const dest = linkHref && app.metadataCache.getFirstLinkpathDest(linkHref, source);

    if (dest) {
        const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(dest.path)?.last()
        setLinkMetadataFormButton(plugin, link, dest.path.replace(/(.*).md/, "$1"), viewTypeName, fileClassName);
    }
}

export function updateDivExtraAttributes(app: App, plugin: MetadataMenu, link: HTMLElement, viewTypeName: string | null, sourceName: string, _linkName?: string) {
    const linkName = _linkName || link.textContent
    const dest = linkName && app.metadataCache.getFirstLinkpathDest(getLinkpath(linkName), sourceName)
    if (dest) {
        const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(dest.path)?.last()
        setLinkMetadataFormButton(plugin, link, dest.path.replace(/(.*).md/, "$1"), viewTypeName, fileClassName);
    }
}


export function updateElLinks(app: App, plugin: MetadataMenu, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const links = el.querySelectorAll('a.internal-link');
    const source = ctx.sourcePath.replace(/(.*).md/, "$1");
    links.forEach((link: HTMLElement) => {
        updateLinkMetadataMenuFormButton(app, plugin, link, 'a.internal-link', source)
    });
}

export function updateVisibleLinks(app: App, plugin: MetadataMenu) {
    const settings = plugin.settings;
    app.workspace.iterateRootLeaves((leaf) => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
            const file: TFile = leaf.view.file;
            const cachedFile = app.metadataCache.getFileCache(file);
            const fileName = file.path.replace(/(.*).md/, "$1")
            //@ts-ignore
            const tabHeader: HTMLElement = leaf.tabHeaderInnerTitleEl;
            if (settings.enableTabHeader) {
                // Supercharge tab headers
                updateDivExtraAttributes(app, plugin, tabHeader, 'tabHeader', fileName);
            }
            else {
                clearExtraAttributes(tabHeader);
            }


            if (cachedFile?.links && settings.enableLinks) {
                cachedFile.links.forEach((link: LinkCache) => {
                    const dest = app.metadataCache.getFirstLinkpathDest(link.link, fileName)
                    if (dest) {
                        const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(dest.path)?.last()

                        const internalLinks = leaf.view.containerEl.querySelectorAll(`a.internal-link[href="${link.link}"]`)
                        internalLinks.forEach((internalLink: HTMLElement) => setLinkMetadataFormButton(plugin, internalLink, dest.path.replace(/(.*).md/, "$1"), `a.internal-link`, fileClassName))
                    }
                })
            }
        }
    })
}