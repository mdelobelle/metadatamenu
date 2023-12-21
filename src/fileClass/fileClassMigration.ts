import MetadataMenu from "main";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { legacyGenuineKeys } from "src/utils/dataviewUtils";
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
                legacyGenuineKeys(dvFile).forEach(key => {
                    if (key !== "file" && !Object.keys(dvFile.file.frontmatter || {}).includes(key)) {
                        const item = typeof dvFile[key] !== "string"
                            ? JSON.stringify(dvFile[key])
                            : dvFile[key];
                        try {
                            const { type, options, command, display, style } = JSON.parse(item);
                            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
                            const attr = new FileClassAttribute(plugin, this.name, key, this.name, fieldType, options, fileClass.name, command, display, style)
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
                        id: Field.getNewFieldId(this.plugin),
                        command: attr.command,
                        display: attr.display,
                        name: attr.name,
                        options: attr.options,
                        style: attr.style,
                        type: attr.type,
                        path: ""
                    })
                })
                fm.fields = fields
                fm.version = "2.0"
            })
        }
    }

    static async migrateV1FileClasses(plugin: MetadataMenu): Promise<void> {
        const index = plugin.fieldIndex
        await Promise.all(
            [...index.v1FileClassesPath.values()].map(async remainingV1FileClass => {
                const migration = new V1FileClassMigration(plugin)
                await migration.migrate(remainingV1FileClass)
            })
        )
        if ([...index.v1FileClassesPath.values()].length) await index.indexFields()
    }

}