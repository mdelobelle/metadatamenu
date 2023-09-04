import MetadataMenu from "main";
import { FileClass } from "src/fileClass/fileClass";

export async function removeFileClassAttributeWithName(plugin: MetadataMenu, fileClass: FileClass, name: string): Promise<void> {
    const file = fileClass.getClassFile();
    if (file) {
        await plugin.app.fileManager.processFrontMatter(file, fm => {
            fm.fields = fm.fields.filter((f: any) => f.name !== name)
        })
    }
}