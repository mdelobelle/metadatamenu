import MetadataMenu from "main";

export async function createFileClass(plugin: MetadataMenu, name: string, mapWithTag: boolean = false): Promise<void> {
    const fileClassesPath = plugin.settings.classFilesPath
    if (fileClassesPath) {
        try {
            const content = mapWithTag ? "---\nmapWithTag: true\n---\n" : ""
            await plugin.app.vault.create(`${fileClassesPath}${name}.md`, content)
        } catch (error) {
            throw (error)
        }
    }
}