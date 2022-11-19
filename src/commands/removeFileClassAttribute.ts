import MetadataMenu from "main";
import { FileClass } from "src/fileClass/fileClass";

export async function removeFileClassAttributeWithName(plugin: MetadataMenu, fileClass: FileClass, name: string): Promise<void> {
    const file = fileClass.getClassFile();
    if (file) {
        const content = (await plugin.app.vault.cachedRead(file)).split('\n');
        const newContent = content.map((line, i) => {
            if (!line.startsWith(name)) return line;
        });
        await plugin.app.vault.modify(file, newContent.join('\n'));
    }
}