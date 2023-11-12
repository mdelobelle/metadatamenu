import { App, getLinkpath, LinkCache, MarkdownPostProcessorContext, MarkdownView, TFile, setIcon } from "obsidian"
import MetadataMenu from "main";
import NoteFieldsComponent from "../components/NoteFields";
import { FileClassManager } from "src/components/fileClassManager";
import { Status } from "src/types/lookupTypes";
import { FieldType } from "src/types/fieldTypes";

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
    const setStatusChanged = (el: Element) => {
        const path = destPath + ".md"
        el.removeClass("field-status-changed")
        const changed = plugin.fieldIndex.dvQFieldChanged(path)
        if (changed) el.addClass("field-status-changed")
    }
    if (link.classList.contains("metadata-menu-button-hidden")) return; //so that snippets can prevent the button from being added
    switch (viewTypeName) {
        case "a.internal-link": if (!plugin.settings.enableLinks) return; break;
        case "properties": if (!plugin.settings.enableLinks) return; break;
        case "tabHeader": if (!plugin.settings.enableTabHeader) return; break;
        case "starred": if (!plugin.settings.enableStarred) return; break;
        case "bookmarks": if (!plugin.settings.enableStarred) return; break;
        case "file-explorer": if (!plugin.settings.enableFileExplorer) return; break;
        case "backlink": if (!plugin.settings.enableBacklinks) return; break;
        case "search": if (!plugin.settings.enableSearch) return; break;
        case "outgoing-link": if (!plugin.settings.enableBacklinks) return; break;
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
    if (
        !(plugin.fieldIndex.indexableFiles().map(f => f.path).includes(`${destPath}.md`)) &&
        !(plugin.fieldIndex.indexableFileClasses().map(f => f.path).includes(`${destPath}.md`))
    ) return
    const classFilessPath = plugin.settings.classFilesPath
    const fileClass = plugin.fieldIndex.fileClassesPath.get(destPath + ".md")
    if (classFilessPath && fileClass) {
        const icon = fileClass.getIcon() || "file-spreadsheet"
        link.setAttribute("fileclass-name", fileClass.name)
        const el = link.nextElementSibling
        if (!el?.hasClass("fileclass-icon")) {
            const metadataMenuBtn = plugin.app.workspace.containerEl.createEl('a', { cls: "metadata-menu fileclass-icon" })
            setStatusChanged(metadataMenuBtn)
            if (metadataMenuBtn) {
                setIcon(metadataMenuBtn, icon)
                link.parentElement?.insertBefore(metadataMenuBtn, link.nextSibling)
                metadataMenuBtn.onclick = (event) => {
                    plugin.addChild(new FileClassManager(plugin, fileClass))
                    event.stopPropagation();
                }
            }
        } else {
            setStatusChanged(el)
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
                setStatusChanged(metadataMenuBtn)
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
            } else {
                setStatusChanged(el)
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
    //console.log(viewTypeName, "|", link, "|", sourceName, "|", _linkName)
    switch (viewTypeName) {
        case "file-explorer": {
            const dataPath = link?.parentElement?.dataset.path
            if (dataPath) {
                const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(dataPath)?.last()
                setLinkMetadataFormButton(plugin, link, dataPath.replace(/(.*).md/, "$1"), viewTypeName, fileClassName);
            }
        }
            break;
        case "tabHeader": {
            if (sourceName) {
                const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(sourceName)?.last()
                setLinkMetadataFormButton(plugin, link, sourceName.replace(/(.*).md/, "$1"), viewTypeName, fileClassName);
            }
        }
            break;
        case "outgoing-link": {
            const dest = link.innerText.split("\n")[0]
            if (dest) {
                const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(`${dest}.md`)?.last()
                setLinkMetadataFormButton(plugin, link, dest, viewTypeName, fileClassName);
            }
        }
            break;
        default: {
            const linkName = _linkName || link.textContent
            const dest = linkName && app.metadataCache.getFirstLinkpathDest(getLinkpath(linkName), sourceName)
            if (dest) {
                const fileClassName = plugin.fieldIndex.filesFileClassesNames.get(dest.path)?.last()
                setLinkMetadataFormButton(plugin, link, dest.path.replace(/(.*).md/, "$1"), viewTypeName, fileClassName);
            }
        }
            break;
    }
}


export function updateElLinks(app: App, plugin: MetadataMenu, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const links = el.querySelectorAll('a.internal-link');
    const source = ctx.sourcePath.replace(/(.*).md/, "$1");
    links.forEach((link: HTMLElement) => {
        updateLinkMetadataMenuFormButton(app, plugin, link, 'a.internal-link', source)
    });
}

export function updatePropertiesPane(propertiesEl: HTMLElement, file: TFile, app: App, plugin: MetadataMenu) {
    const frontmatter = app.metadataCache.getCache(file.path)?.frontmatter;
    if (!!frontmatter) {
        const nodes = propertiesEl.querySelectorAll("div.internal-link > .multi-select-pill-content");
        for (let i = 0; i < nodes.length; ++i) {
            const el = nodes[i] as HTMLElement;
            const linkText = el.textContent;
            const keyEl = el?.parentElement?.parentElement?.parentElement?.parentElement?.children[0].children[1];
            // @ts-ignore
            const key = keyEl.value;
            const listOfLinks: [string] = frontmatter[key];
            let foundS = null;
            if (!listOfLinks) {
                continue;
            }
            for (const s of listOfLinks) {
                if (s.length > 4 && s.startsWith("[[") && s.endsWith("]]")) {
                    const slicedS = s.slice(2, -2);
                    const split = slicedS.split("|");
                    if (split.length == 1 && split[0] == linkText) {
                        foundS = split[0];
                        break;
                    } else if (split.length == 2 && split[1] == linkText) {
                        foundS = split[0];
                        break;
                    }
                }
            }
            if (!!foundS) {
                updateDivExtraAttributes(plugin.app, plugin, el, "properties", foundS);
            }
        }
        const singleNodes = propertiesEl.querySelectorAll("div.metadata-link-inner");
        for (let i = 0; i < singleNodes.length; ++i) {
            const el = singleNodes[i] as HTMLElement;
            const linkText = el.textContent;
            const keyEl = el?.parentElement?.parentElement?.parentElement?.children[0].children[1];
            // @ts-ignore
            const key = keyEl.value;
            const link: string = frontmatter[key];
            if (!link) {
                continue;
            }
            let foundS: string | null = null;
            if (link.length > 4 && link.startsWith("[[") && link.endsWith("]]")) {
                const slicedS = link.slice(2, -2);
                const split = slicedS.split("|");
                if (split.length == 1 && split[0] == linkText) {
                    foundS = split[0];
                } else if (split.length == 2 && split[1] == linkText) {
                    foundS = split[0];
                }
            }
            if (!!foundS) {
                updateDivExtraAttributes(plugin.app, plugin, el, "properties", foundS);
            }
        }
    }
}


export function updateVisibleLinks(app: App, plugin: MetadataMenu) {
    const settings = plugin.settings;
    app.workspace.iterateRootLeaves((leaf) => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
            const file: TFile = leaf.view.file;
            const cachedFile = app.metadataCache.getFileCache(file);
            const fileName = file.path.replace(/(.*).md/, "$1")

            // @ts-ignore
            const metadata = leaf.view?.metadataEditor.contentEl;
            if (!!metadata) {//
                updatePropertiesPane(metadata, file, app, plugin);
            }

            //@ts-ignore
            const tabHeader: HTMLElement = leaf.tabHeaderInnerTitleEl;
            if (settings.enableTabHeader) {
                // Supercharge tab headers
                updateDivExtraAttributes(app, plugin, tabHeader, 'tabHeader', leaf.view.file.path);
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