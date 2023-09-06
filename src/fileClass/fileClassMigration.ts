import MetadataMenu from "main";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { genuineKeys } from "src/utils/dataviewUtils";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { capitalize } from "src/utils/textUtils";
import { FileClass } from "./fileClass";
import { FileClassAttribute } from "./fileClassAttribute";

export class V1FileClassMigration {
    /*
    Moving fileClass fields definition from dataview inline fields to frontmatter yaml
    */
    constructor(public plugin: MetadataMenu) {

    }
    static getInlineFileClassAttributes(plugin: MetadataMenu, fileClass: FileClass, excludes?: string[]): FileClassAttribute[] {
        //this method will be used to get attributes from legacy inline fields to populate frontmatter
        const file = fileClass.getClassFile();
        let attributes: Array<FileClassAttribute> = [];
        const dvApi = plugin.app.plugins.plugins["dataview"]?.api
        //@ts-ignore
        if (dvApi) {
            const dvFile = dvApi.page(file.path)
            try {
                genuineKeys(dvFile).forEach(key => {
                    if (key !== "file" && !Object.keys(dvFile.file.frontmatter || {}).includes(key)) {
                        const item = typeof dvFile[key] !== "string"
                            ? JSON.stringify(dvFile[key])
                            : dvFile[key];
                        try {
                            const { type, options, command, display, style } = JSON.parse(item);
                            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
                            const attr = new FileClassAttribute(this.name, key, fieldType, options, fileClass.name, command, display, style)
                            attributes.push(attr)
                        } catch (e) {
                            //do nothing
                        }
                    }
                })
            } catch (error) {
                throw (error);
            }
        }
        if (excludes) {
            return attributes.filter(attr => !excludes.includes(attr.name))
        } else {
            return attributes
        }
    }

    public async migrate(fileClass: FileClass): Promise<void> {
        const file = fileClass.getClassFile();
        if (!fileClass.getMajorVersion() || fileClass.getMajorVersion() as number < 2) {
            const fields: any[] = []
            await this.plugin.app.fileManager.processFrontMatter(file, async (fm) => {
                const attributes = V1FileClassMigration.getInlineFileClassAttributes(this.plugin, fileClass)
                attributes.forEach(attr => {
                    fields.push({
                        command: attr.command,
                        display: attr.display,
                        name: attr.name,
                        options: attr.options,
                        style: attr.style,
                        type: attr.type
                    })
                })
                fm.fields = fields
                fm.version = "2.0"
            })
        }
    }

}


export class V2FileClassMigration {
    /*
    removing inline fields definitions
    */
    constructor(public plugin: MetadataMenu) {

    }

    public async migrate(fileClass: FileClass): Promise<void> {
        const file = fileClass.getClassFile();
        if (!fileClass.getMajorVersion() || fileClass.getMajorVersion() as number === 2) {
            this.plugin.app.fileManager.processFrontMatter(file, async (fm) => {
                fm.version = "3.0"
            })
            const content = await app.vault.read(file)
            const end = getFrontmatterPosition(this.plugin, file).end
            const newContent = content.split("\n").slice(0, end.line + 1).join("\n")
            await this.plugin.fileTaskManager.pushTask(() => app.vault.modify(file, newContent))
        }
    }
}