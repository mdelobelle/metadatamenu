import MetadataMenu from "main";

export async function createFileClass(plugin: MetadataMenu, name: string, mapWithTag: boolean = false, tagNames: string[] = []): Promise<void> {
    const classFilesPath = plugin.settings.classFilesPath
    if (classFilesPath) {
        try {
            const content = mapWithTag ? `---\nmapWithTag: true\n${tagNames.length ? "tagNames: [" + tagNames.join(", ") + "]\n" : ""}---\n` : ""
            await plugin.app.vault.create(`${classFilesPath}${name}.md`, content)
        } catch (error) {
            throw (error)
        }
    }
}