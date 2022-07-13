import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { TFile } from "obsidian";

interface FileClass {
    plugin: MetadataMenu;
    name: string;
    attributes: Array<FileClassAttribute>;
    objects: FileClassManager;
    errors: string[];
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
            const error = new Error("no such fileClass in fileClass folder");
            throw error;
        }
    }

    public getAttributes(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const file = this.getClassFile();
                let attributes: Array<FileClassAttribute> = [];
                let errors: string[] = [];
                this.plugin.app.vault.cachedRead(file).then(result => {
                    result.split('\n').forEach(line => {
                        try {
                            const attribute = new FileClassAttribute(line);
                            attributes.push(attribute);
                        } catch (error) {
                            errors.push(error);
                        }
                    })
                    this.attributes = attributes;
                    this.errors = errors;
                    resolve();
                })
            } catch (error) {
                reject(error);
            }
        })
    }

    public updateAttribute(newType: string, newOptions: string[], newName: string, attr?: FileClassAttribute): Promise<void> {
        return new Promise((resolve, reject) => {

            const file = this.getClassFile();
            this.plugin.app.vault.read(file).then(result => {
                if (attr) {
                    let newContent: string[] = [];
                    result.split('\n').forEach(line => {
                        if (line.startsWith(attr.name)) {
                            if (newType == "input") {
                                newContent.push(newName);
                            } else {
                                let settings: Record<string, any> = {};
                                settings["type"] = newType;
                                settings["options"] = newOptions;
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
                    settings["options"] = newOptions;
                    result += (`\n${newName}:: ${JSON.stringify(settings)}`);
                    this.plugin.app.vault.modify(file, result);
                }
                resolve();
            })
        })
    }

    public removeAttribute(attr: FileClassAttribute): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = this.getClassFile();
            this.plugin.app.vault.read(file).then(result => {
                let newContent: string[] = [];
                result.split('\n').forEach(line => {
                    if (!line.startsWith(attr.name)) {
                        newContent.push(line);
                    }
                })
                this.plugin.app.vault.modify(file, newContent.join('\n'));
                resolve();
            })

        })
    }
}

async function createFileClass(plugin: MetadataMenu, name: string): Promise<FileClass> {
    return new Promise((resolve, reject) => {
        const fileClass = new FileClass(plugin, name);
        fileClass.getAttributes().then(() => {
            resolve(fileClass);
        }).catch((error) => {
            reject(error);
        })
    })
}

export { createFileClass, FileClass };