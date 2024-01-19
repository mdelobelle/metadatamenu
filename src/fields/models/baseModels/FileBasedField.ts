import MetadataMenu from "main"
import { TFile } from "obsidian"

export function buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string, subPath?: string, alias?: string): string {
    const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
    if (destFile) {
        return plugin.app.fileManager.generateMarkdownLink(
            destFile,
            file.path,
            subPath,
            alias,
        )
    }
    return ""
}