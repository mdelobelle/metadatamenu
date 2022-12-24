import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { SuggestModal, TFile } from "obsidian";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { capitalize } from "src/utils/textUtils";
import { genuineKeys } from "src/utils/dataviewUtils";
import { FieldCommand } from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { postValues } from "src/commands/postValues";

const options: Record<string, { name: string, toValue: (value: any) => string }> = {
    "limit": { name: "limit", toValue: (value: any) => `${value || ""}` },
    "mapWithTag": { name: "mapWithTag", toValue: (value: boolean) => value.toString() },
    "icon": { name: "icon", toValue: (value: any) => `${value || ""}` },
    "tagNames": { name: "tagNames", toValue: (values: string[]) => values.join(", ") },
    "excludes": { name: "excludes", toValue: (values: FileClassAttribute[]) => values.map(attr => attr.name).join(", ") },
    "parent": { name: "extends", toValue: (value: FileClass) => `${value?.name || ""}` }
}

export interface FileClassOptions {
    limit: number,
    icon: string,
    parent?: FileClass;
    excludes?: Array<FileClassAttribute>;
    tagNames?: string[],
    mapWithTag: boolean
}

export class FileClassOptions {

    constructor(
        public limit: number,
        public icon: string,
        public parent?: FileClass,
        public excludes?: Array<FileClassAttribute>,
        public tagNames?: string[],
        public mapWithTag: boolean = false
    ) {

    }
}

interface FileClass extends FileClassOptions {
    attributes: Array<FileClassAttribute>;
    objects: FileClassObjects;
    errors: string[];
}

export class AddFileClassToFileModal extends SuggestModal<string> {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile
    ) {
        super(plugin.app)
    }

    getSuggestions(query: string): string[] | Promise<string[]> {
        return [...this.plugin.fieldIndex.fileClassesName.keys()]
            .filter(fileClassName => !this.plugin.fieldIndex.filesFileClasses
                .get(this.file.path)?.map(fileClass => fileClass.name)
                .includes(fileClassName)
            )
            .filter(fileClassName => fileClassName.toLocaleLowerCase().contains(query.toLowerCase()))
            .sort();
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value);
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.insertFileClassToFile(item)
    }

    async insertFileClassToFile(value: string) {
        const fileClassAlias = this.plugin.settings.fileClassAlias
        const currentFileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path)
        const newValue = currentFileClasses ? [...currentFileClasses.map(fc => fc.name), value].join(", ") : value
        await postValues(this.plugin, [{ name: fileClassAlias, payload: { value: newValue } }], this.file)
    }
}

class FileClassObjects {

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
        const filesWithName = this.all().filter(file => file.path.replace(/md$/, "").endsWith(name));
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
        this.objects = new FileClassObjects(this);
        this.attributes = [];
    }

    public getFileClassOptions(): FileClassOptions {
        const {
            extends: _parent,
            limit: _limit,
            excludes: _excludes,
            mapWithTag: _mapWithTag,
            tagNames: _tagNames,
            icon: _icon
        } = this.plugin.app.metadataCache.getFileCache(this.getClassFile())?.frontmatter as Record<string, any> || {}
        const parent = this.plugin.fieldIndex.fileClassesName.get(_parent);
        const excludedNames = FileClass.getExcludedFieldsFromFrontmatter(_excludes);
        const excludes = this.attributes.filter(attr => excludedNames.includes(attr.name))
        const limit = typeof (_limit) === 'number' ? _limit : this.plugin.settings.tableViewMaxRecords
        const mapWithTag = FieldManager.stringToBoolean(_mapWithTag);
        const tagNames = FileClass.getTagNamesFromFrontMatter(_tagNames);
        const icon = typeof (_icon) === 'string' ? _icon : this.plugin.settings.buttonIcon
        return new FileClassOptions(limit, icon, parent, excludes, tagNames, mapWithTag);
    }

    public isMappedWithTag(): boolean {
        try {
            const fileClassFile = this.getClassFile();
            const mapWithTag = this.plugin.app.metadataCache.getFileCache(fileClassFile)?.frontmatter?.mapWithTag;
            return !!mapWithTag;
        } catch (error) {
            return false
        }
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

    getIcon(): string | undefined {
        const parents = [this.name, ...this.plugin.fieldIndex.fileClassesAncestors.get(this.name) || []]
        let icon: string | undefined;
        parents.some((fileClassName, i) => {
            const fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            if (fileClass) {
                const file = fileClass.getClassFile();
                const _icon = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.icon
                if (_icon) {
                    icon = _icon
                    return true;
                };
            }
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
                            const { type, options, command } = JSON.parse(item);
                            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
                            const attr = new FileClassAttribute(this.name, key, fieldType, options, fileClass.name, command)
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

    static getTagNamesFromFrontMatter(_tagNames: string[] | string | undefined): string[] {
        if (Array.isArray(_tagNames)) {
            return _tagNames;
        } else if (_tagNames) {
            return _tagNames.split(",")
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
                    ancestorsAttributes.set(ancestorName, FileClass.getFileClassAttributes(this.plugin, ancestor, excludedFields))
                    if (ancestorFile instanceof TFile && ancestorFile.extension === "md") {
                        const _excludedFields = this.plugin.app.metadataCache.getFileCache(ancestorFile)?.frontmatter?.excludes
                        excludedFields = FileClass.getExcludedFieldsFromFrontmatter(_excludedFields);
                    }
                })
            }
            for (const [fileClassName, fileClassAttributes] of ancestorsAttributes) {
                this.attributes.push(...fileClassAttributes.filter(attr => !this.attributes.map(_attr => _attr.name).includes(attr.name)))
            }
        } catch (error) {
            throw (error);
        }

    }

    public async updateOptions(newOptions: FileClassOptions): Promise<void> {
        console.log("options")
        const path = this.getClassFile().path
        Object.keys(options).forEach(async (key: keyof typeof options) => {
            const { name, toValue } = options[key]
            console.log(toValue(newOptions[key as keyof FileClassOptions]))
            await postValues(this.plugin, [{ name: name, payload: { value: toValue(newOptions[key as keyof FileClassOptions]) } }], path)
        })
    }

    public async updateAttribute(
        newType: keyof typeof FieldType,
        newName: string,
        newOptions?: string[] | Record<string, string>,
        attr?: FileClassAttribute,
        newCommand?: FieldCommand
    ): Promise<void> {
        const fileClass = attr ? this.plugin.fieldIndex.fileClassesName.get(attr.fileClassName)! : this
        const file = fileClass.getClassFile();
        let result = await this.plugin.app.vault.read(file)
        if (attr) {
            let newContent: string[] = [];
            result.split('\n').forEach(line => {
                if (line.startsWith(attr.name)) {
                    let settings: Record<string, any> = {};
                    settings["type"] = newType;
                    if (newOptions) settings["options"] = newOptions;
                    if (newCommand) settings["command"] = newCommand;
                    newContent.push(`${newName}:: ${JSON.stringify(settings)}`);
                } else {
                    newContent.push(line);
                }
            })
            await this.plugin.app.vault.modify(file, newContent.join('\n'));
        } else {
            let settings: Record<string, any> = {};
            settings["type"] = newType;
            if (newOptions) settings["options"] = newOptions;
            if (newCommand) settings["command"] = newCommand;
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

    static getFileClassNameFromPath(plugin: MetadataMenu, path: string): string | undefined {
        const fileClassNameRegex = new RegExp(`${plugin.settings.classFilesPath}(?<fileClassName>.*).md`);
        return path.match(fileClassNameRegex)?.groups?.fileClassName
    }
}

export { FileClass };