import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { TFile } from "obsidian";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { capitalize } from "src/utils/textUtils";
import { genuineKeys } from "src/utils/dataviewUtils";

interface FileClass {
    attributes: Array<FileClassAttribute>;
    objects: FileClassManager;
    errors: string[];
    parent?: FileClass;
    excludes?: Array<FileClassAttribute>;
    matchWithTag?: boolean
}

class FileClassManager {

    constructor(public instance: FileClass) { }

    public all() {
        const filesWithFileClassName = this.instance.plugin.app.vault.getMarkdownFiles().filter(file => {
            const cache = this.instance.plugin.app.metadataCache.getFileCache(file);
            const fileClassAlias = this.instance.plugin.settings.fileClassAlias;
            return cache?.frontmatter
                && Object.keys(cache.frontmatter).includes(fileClassAlias)
                && cache.frontmatter[fileClassAlias] == this.instance.name;
        })
        return filesWithFileClassName;
    }

    public get(name: string) {
        const filesWithName = this.all().filter(file => file.basename == name);
        if (filesWithName.length > 1) {
            const error = new Error("More than one value found");
            throw error;
        }
        if (filesWithName.length == 0) {
            const error = new Error("No file value found");
            throw error;
        }
        return filesWithName[0];

    }

    public getPath(path: string) {
        const filesWithName = this.all().filter(file => file.path == path);
        if (filesWithName.length > 1) {
            const error = new Error("More than one value found");
            throw error;
        }
        if (filesWithName.length == 0) {
            const error = new Error("No file value found");
            throw error;
        }
        return filesWithName[0];

    }
}

class FileClass {
    constructor(public plugin: MetadataMenu, public name: string) {
        this.objects = new FileClassManager(this);
        this.attributes = [];
    }

    public getClassFile(): TFile {
        const filesClassPath = this.plugin.settings.classFilesPath;
        const file = this.plugin.app.vault.getAbstractFileByPath(`${filesClassPath}${this.name}.md`);
        if (file instanceof TFile && file.extension == "md") {
            return file;
        } else {
            const error = new Error(
                `no file named <${this.name}.md> in <${filesClassPath}> folder to match <${this.plugin.settings.fileClassAlias}: ${this.name}> in one of these notes`
            );
            throw error;
        }
    }

    public getInheritanceList(): FileClass[] {
        const file = this.getClassFile();
        const parent = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.extends
        if (false && parent) {
            const parentFileClass = FileClass.createFileClass(this.plugin, parent);
            return [...parentFileClass.getInheritanceList(), this]
        }
        return [this]
    }

    getIcon(): string | undefined {
        const parents = this.getInheritanceList();
        parents.reverse()
        let icon: string | undefined;
        parents.some((fileClass, i) => {
            const file = fileClass.getClassFile();
            const _icon = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.icon
            if (_icon) {
                icon = _icon
                return true;
            };
        })
        return icon
    }

    static getFileClassAttributes(plugin: MetadataMenu, fileClass: FileClass, excludes?: string[]): FileClassAttribute[] {

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
                            const { type, options } = JSON.parse(item);
                            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
                            const attr = new FileClassAttribute(this.name, key, fieldType, options, fileClass)
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

    static getExcludedFieldsFromFrontmatter(excludedFields: string[] | string | undefined): string[] {
        if (Array.isArray(excludedFields)) {
            return excludedFields;
        } else if (excludedFields) {
            return excludedFields.split(",")
        } else {
            return []
        }
    }

    public getAttributes(excludeParents: boolean = false): void {
        try {
            const file = this.getClassFile();
            const ancestors = this.plugin.fieldIndex.fileClassesAncestors.get(this.name);
            const _excludedFields = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.excludes
            let excludedFields = FileClass.getExcludedFieldsFromFrontmatter(_excludedFields);

            const ancestorsAttributes: Map<string, FileClassAttribute[]> = new Map();
            ancestorsAttributes.set(this.name, FileClass.getFileClassAttributes(this.plugin, this, excludedFields))
            if (!excludeParents) {
                ancestors?.forEach(ancestorName => {
                    const ancestorFile = this.plugin.app.vault.getAbstractFileByPath(`${this.plugin.settings.classFilesPath}${ancestorName}.md`)
                    const ancestor = new FileClass(this.plugin, ancestorName);
                    ancestorsAttributes.set(ancestor.name, FileClass.getFileClassAttributes(this.plugin, ancestor, excludedFields))
                    if (ancestorFile instanceof TFile && ancestorFile.extension === "md") {
                        const _excludedFields = this.plugin.app.metadataCache.getFileCache(ancestorFile)?.frontmatter?.excludes
                        excludedFields = FileClass.getExcludedFieldsFromFrontmatter(_excludedFields);
                    }
                })
            }
            for (const [fileClassName, fileClassAttributes] of ancestorsAttributes) {
                this.attributes.push(...fileClassAttributes.filter(attr => !this.attributes.map(_attr => _attr.name).includes(attr.name)))
            }
            console.log(this.name, this.attributes)
        } catch (error) {
            throw (error);
        }

    }

    public async updateAttribute(newType: keyof typeof FieldType, newName: string, newOptions?: string[] | Record<string, string>, attr?: FileClassAttribute): Promise<void> {
        const fileClass = attr ? attr.fileClass : this
        const file = fileClass.getClassFile();
        let result = await this.plugin.app.vault.read(file)
        if (attr) {
            let newContent: string[] = [];
            result.split('\n').forEach(line => {
                if (line.startsWith(attr.name)) {
                    let settings: Record<string, any> = {};
                    settings["type"] = newType;
                    if (newOptions) settings["options"] = newOptions;
                    newContent.push(`${newName}:: ${JSON.stringify(settings)}`);
                } else {
                    newContent.push(line);
                }
            })
            this.plugin.app.vault.modify(file, newContent.join('\n'));
        } else {
            let settings: Record<string, any> = {};
            settings["type"] = newType;
            if (newOptions) settings["options"] = newOptions;
            result += (`\n${newName}:: ${JSON.stringify(settings)}`);
            await this.plugin.app.vault.modify(file, result);
        }
    }

    public async removeAttribute(attr: FileClassAttribute): Promise<void> {
        const file = this.getClassFile();
        const result = await this.plugin.app.vault.read(file)
        let newContent: string[] = [];
        result.split('\n').forEach(line => {
            if (!line.startsWith(attr.name)) {
                newContent.push(line);
            }
        })
        await this.plugin.app.vault.modify(file, newContent.join('\n'));
    }

    static createFileClass(plugin: MetadataMenu, name: string, excludeParent: boolean = false): FileClass {
        const fileClass = new FileClass(plugin, name);
        fileClass.getAttributes()
        return fileClass
    }

    static getFileClassesInheritanceForFileFields(plugin: MetadataMenu, file: TFile): Record<string, FileClass[]> {
        const fileClassesInheritanceForFields: Record<string, FileClass[]> = {};
        const fileFields = plugin.fieldIndex.filesFields.get(file.path)
        const fileClassesNames: string[] = []
        if (fileFields) {
            fileFields.forEach(fields => {
                const fileClass = fields.fileClass
                if (fileClass && !fileClassesNames.includes(fileClass.name)) {
                    fileClassesNames.push(fileClass.name)
                    const inheritanceList = fileClass.getInheritanceList();
                    //remove ancestors from fileClassesInheritanceForFields to keep the youngest fileClass
                    inheritanceList.forEach(_fileClass => {
                        delete (fileClassesInheritanceForFields[_fileClass.name])
                    })
                    //then add this one
                    fileClassesInheritanceForFields[fileClass.name] = inheritanceList;
                }
            })
        }
        return fileClassesInheritanceForFields
    }
}


export { FileClass };