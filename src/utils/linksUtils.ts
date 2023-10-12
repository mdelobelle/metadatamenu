import MetadataMenu from "main"
import { TFile } from "obsidian"
import { extractLinks, getLink } from "./parser"

export const displayLinksOrText = (value: string | string[], file: TFile, container: HTMLDivElement, plugin: MetadataMenu, onClicked: () => {}) => {
    const links = typeof value === 'string' ? extractLinks(value) : undefined
    if (links) {
        links.forEach((_link, i) => {
            const link = getLink(_link, file)
            if (link?.path) {
                const linkText = link.path.split("/").last() || ""
                const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
                linkEl.onclick = () => {
                    plugin.app.workspace.openLinkText(link.path, file.path, true)
                    onClicked()
                }
            }
            if (i < links.length - 1) {
                container.createEl('span', { text: " | " })
            }
        })

    } else {
        const values = Array.isArray(value) ? value : [value]
        values.forEach((value, i) => {
            if (value) {
                const link = getLink(value, file)
                if (link?.path) {
                    const linkText = link.path.split("/").last() || ""
                    const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
                    linkEl.onclick = () => {
                        plugin.app.workspace.openLinkText(link.path, file.path, true)
                        onClicked()
                    }
                } else {
                    container.createDiv({ text: value });
                }
                if (i < values.length - 1) {
                    container.createEl('span', { text: " | " })
                }
            }
        })
    }
}