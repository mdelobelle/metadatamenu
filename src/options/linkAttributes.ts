import { App, getLinkpath, LinkCache, MarkdownPostProcessorContext, MarkdownView, TFile, setIcon } from "obsidian"
import { MetadataMenuSettings } from "src/settings/MetadataMenuSettings"
import MetadataMenu from "main";

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

export function fetchFileClassName(app: App, settings: MetadataMenuSettings, dest: TFile, addDataHref: boolean): string | undefined {
    const cache = app.metadataCache.getFileCache(dest)
    return cache?.frontmatter?.[settings.fileClassAlias]
}

function setLinkMetadataFormButton(plugin: MetadataMenu, link: HTMLElement, viewTypeName: string | null, fileClassName?: string) {
    console.log(viewTypeName);
    switch (viewTypeName) {
        case "a.internal-link":
            if (!plugin.settings.enableLinks) return;
            break;
        case "tabHeader":
            if (!plugin.settings.enableTabHeader) return;
            break;
        case "starred":
            if (!plugin.settings.enableStarred) return;
            break;
        case "file-explorer":
            if (!plugin.settings.enableFileExplorer) return;
            break;
        case "backlink":
            if (!plugin.settings.enableBacklinks) return;
            break;
        case "search":
            if (!plugin.settings.enableSearch) return;
            break;
        case "a.internal-link":
            if (!plugin.settings.enableLinks) return;
            break;
        default:
            return;

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
    if (fileClassName) {
        const fileClass = plugin.app.vault.getAbstractFileByPath(`${plugin.settings.classFilesPath}${fileClassName}.md`)
        if (fileClass instanceof TFile && fileClass.extension === "md") {
            const icon = plugin.app.metadataCache.getFileCache(fileClass)?.frontmatter?.["icon"]
            link.setAttribute("fileclass-name", fileClassName)
            const el = link.nextElementSibling
            if (!el?.hasClass("fileclass-icon")) {
                const metadataMenuBtn = plugin.app.workspace.containerEl.createEl('a', { cls: "fileclass-icon" })
                if (metadataMenuBtn) {
                    setIcon(metadataMenuBtn, icon || "link")
                    link.parentElement?.insertBefore(metadataMenuBtn, link.nextSibling)
                    metadataMenuBtn.onclick = (event) => {
                        alert("coucou");
                        event.stopPropagation();
                    }
                }
            }
        }
    }
}

function updateLinkMetadataMenuFormButton(app: App, plugin: MetadataMenu, link: HTMLElement, viewTypeName: string | null, destName: string) {
    const linkHref = link.getAttribute('href')?.split('#')[0];
    const dest = linkHref && app.metadataCache.getFirstLinkpathDest(linkHref, destName);

    if (dest) {
        const fileClassName = fetchFileClassName(app, plugin.settings, dest, false);
        setLinkMetadataFormButton(plugin, link, viewTypeName, fileClassName);
    }
}

export function updateDivExtraAttributes(app: App, plugin: MetadataMenu, link: HTMLElement, viewTypeName: string | null, destName: string, _linkName?: string) {
    //if (!plugin.settings.enableBacklinks) return;
    const linkName = _linkName || link.textContent
    const dest = linkName && app.metadataCache.getFirstLinkpathDest(getLinkpath(linkName), destName)

    if (dest) {
        const new_props = fetchFileClassName(app, plugin.settings, dest, true);
        setLinkMetadataFormButton(plugin, link, viewTypeName, new_props);
    }
}


export function updateElLinks(app: App, plugin: MetadataMenu, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const links = el.querySelectorAll('a.internal-link');
    const destName = ctx.sourcePath.replace(/(.*).md/, "$1");
    links.forEach((link: HTMLElement) => {
        updateLinkMetadataMenuFormButton(app, plugin, link, 'a.internal-link', destName);
    });
}

export function updateVisibleLinks(app: App, plugin: MetadataMenu) {
    const settings = plugin.settings;
    app.workspace.iterateRootLeaves((leaf) => {
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
            const file: TFile = leaf.view.file;
            const cachedFile = app.metadataCache.getFileCache(file);

            //@ts-ignore
            const tabHeader: HTMLElement = leaf.tabHeaderInnerTitleEl;
            if (settings.enableTabHeader) {
                // Supercharge tab headers
                updateDivExtraAttributes(app, plugin, tabHeader, 'tabHeader', "");
            }
            else {
                clearExtraAttributes(tabHeader);
            }


            if (cachedFile?.links && settings.enableLinks) {
                cachedFile.links.forEach((link: LinkCache) => {
                    const fileName = file.path.replace(/(.*).md/, "$1")
                    const dest = app.metadataCache.getFirstLinkpathDest(link.link, fileName)
                    if (dest) {
                        const new_props = fetchFileClassName(app, settings, dest, false)
                        const internalLinks = leaf.view.containerEl.querySelectorAll(`a.internal-link[href="${link.link}"]`)
                        internalLinks.forEach((internalLink: HTMLElement) => setLinkMetadataFormButton(plugin, internalLink, `a.internal-link`, new_props))
                    }
                })
            }
        }
    })
}