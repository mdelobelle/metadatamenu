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

    public getParentClass(): FileClass | undefined {
        return
    }

    public getAttributes(excludeParents: boolean = false): void {
        try {
            const file = this.getClassFile();
            let parentAttributes: Array<FileClassAttribute> = [];
            let errors: string[] = [];
            const parent = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.extends
            const excludedFields = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.excludes
            if (parent && !excludeParents) {
                try {
                    const parentFileClass = FileClass.createFileClass(this.plugin, parent);
                    parentFileClass.getAttributes();
                    parentAttributes = Array.isArray(excludedFields) ? [...parentFileClass.attributes.filter(attr => !excludedFields.includes(attr.name))] : [...parentFileClass.attributes]
                } catch (error) {
                    errors.push(error)
                }
            }
            let attributes: Array<FileClassAttribute> = [];
            const dataview = this.plugin.app.plugins.plugins["dataview"]
            //@ts-ignore
            if (dataview) {
                const dvFile = dataview.api.page(file.path)
                try {
                    genuineKeys(dvFile).forEach(key => {
                        if (key !== "file") {
                            const item = typeof dvFile[key] !== "string"
                                ? JSON.stringify(dvFile[key])
                                : dvFile[key];
                            try {
                                const { type, options } = JSON.parse(item);
                                const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
                                const attr = new FileClassAttribute(this.name, key, fieldType, options)
                                //deduplicate fields
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
            this.attributes = parentAttributes
                .filter(attr => !attributes
                    .map(_attr => _attr.name)
                    .includes(attr.name)
                ).concat(attributes.filter(p => !Object.keys(this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {}).includes(p.name)));
            this.errors = errors;
        } catch (error) {
            throw (error);
        }
    }

    public async updateAttribute(newType: keyof typeof FieldType, newName: string, newOptions?: string[] | Record<string, string>, attr?: FileClassAttribute): Promise<void> {
        const file = this.getClassFile();
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
        fileClass.getAttributes(excludeParent)
        return fileClass
    }
}


export { FileClass };