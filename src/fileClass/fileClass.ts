import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { TFile } from "obsidian";
import { FieldType } from "src/types/fieldTypes";

interface FileClass {
    plugin: MetadataMenu;
    name: string;
    attributes: Array<FileClassAttribute>;
    objects: FileClassManager;
    errors: string[];
    parent?: FileClass;
    excludes?: Array<FileClassAttribute>;
}

class FileClassManager {
    public instance: FileClass;

    constructor(instance: FileClass) {
        this.instance = instance;
    }

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
    constructor(plugin: MetadataMenu, name: string) {
        this.plugin = plugin;
        this.name = name;
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

    public async getAttributes(excludeParents: boolean = false): Promise<void> {
        try {
            const file = this.getClassFile();
            let attributes: Array<FileClassAttribute> = [];
            let errors: string[] = [];
            const result = await this.plugin.app.vault.cachedRead(file)
            const parent = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.extends
            const excludedFields = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.excludes
            if (parent && !excludeParents) {
                try {
                    const parentFileClass = await createFileClass(this.plugin, parent);
                    await parentFileClass.getAttributes();
                    attributes = [...parentFileClass.attributes]
                } catch (error) {
                    errors.push(error)
                }
            }
            result.split('\n').forEach(line => {
                try {
                    const attribute = new FileClassAttribute(line, this.name);
                    attributes.push(attribute);
                } catch (error) {
                    errors.push(error);
                }
            })
            this.attributes = Array.isArray(excludedFields) ? attributes.filter(attr => !excludedFields.includes(attr.name)) : attributes;
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
                    if (newType == "Input") {
                        newContent.push(`${newName}:: {"type": "Input"}`);
                    } else {
                        let settings: Record<string, any> = {};
                        settings["type"] = newType;
                        if (newOptions) settings["options"] = newOptions;
                        newContent.push(`${newName}:: ${JSON.stringify(settings)}`);
                    }
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
}

async function createFileClass(plugin: MetadataMenu, name: string, excludeParent: boolean = false): Promise<FileClass> {
    return new Promise((resolve, reject) => {
        const fileClass = new FileClass(plugin, name);
        fileClass.getAttributes(excludeParent).then(() => {
            resolve(fileClass);
        }).catch((error) => {
            reject(error);
        })
    })
}

export { createFileClass, FileClass };