import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { SuggestModal, TFile } from "obsidian";
import { FieldType, FieldTypeLabelMapping, MultiDisplayType } from "src/types/fieldTypes";
import { capitalize } from "src/utils/textUtils";
import { FieldCommand } from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { postValues } from "src/commands/postValues";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { v4 as uuidv4 } from "uuid"

const options: Record<string, { name: string, toValue: (value: any) => any }> = {
    "limit": { name: "limit", toValue: (value: any) => value },
    "mapWithTag": { name: "mapWithTag", toValue: (value: boolean) => value },
    "icon": { name: "icon", toValue: (value: any) => `${value || "file-spreadsheet"}` },
    "tagNames": { name: "tagNames", toValue: (values: string[]) => values.length ? values : null },
    "excludes": { name: "excludes", toValue: (values: FileClassAttribute[]) => values.length ? values.map(attr => attr.name) : null },
    "parent": { name: "extends", toValue: (value: FileClass) => value?.name || null }
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
    errors: string[];
    options: FileClassOptions;
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

class FileClass {
    constructor(public plugin: MetadataMenu, public name: string) {
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
        const index = this.plugin.fieldIndex
        const parent = this.plugin.fieldIndex.fileClassesName.get(_parent);
        const excludedNames = FileClass.getExcludedFieldsFromFrontmatter(_excludes);

        const excludes: FileClassAttribute[] = []
        index.fileClassesAncestors.get(this.getClassFile().basename)?.forEach(ancestorName => {
            index.fileClassesName.get(ancestorName)?.attributes.forEach(attr => {
                if (excludedNames.includes(attr.name) && !excludes.map(attr => attr.name).includes(attr.name)) excludes.push(attr)
            })
        })
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
        const rawAttributes = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.fields || []
        const attributes: FileClassAttribute[] = [];
        rawAttributes.forEach((attr: any) => {
            const { type, options, command, display, style } = attr;
            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
            attributes.push(new FileClassAttribute(this.name, attr.name, attr.id, fieldType, options, fileClass.name, command, display, style))
        })
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

    public getAttributes(): void {
        try {
            const file = this.getClassFile();
            const ancestors = this.plugin.fieldIndex.fileClassesAncestors.get(this.name);
            const _excludedFields = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.excludes
            let excludedFields = FileClass.getExcludedFieldsFromFrontmatter(_excludedFields);

            const ancestorsAttributes: Map<string, FileClassAttribute[]> = new Map();
            ancestorsAttributes.set(this.name, FileClass.getFileClassAttributes(this.plugin, this, excludedFields))

            ancestors?.forEach(ancestorName => {
                const ancestorFile = this.plugin.app.vault.getAbstractFileByPath(`${this.plugin.settings.classFilesPath}${ancestorName}.md`)
                const ancestor = new FileClass(this.plugin, ancestorName);
                ancestorsAttributes.set(ancestorName, FileClass.getFileClassAttributes(this.plugin, ancestor, excludedFields))
                if (ancestorFile instanceof TFile && ancestorFile.extension === "md") {
                    const _excludedFields = this.plugin.app.metadataCache.getFileCache(ancestorFile)?.frontmatter?.excludes
                    excludedFields.push(...FileClass.getExcludedFieldsFromFrontmatter(_excludedFields));
                }
            })
            for (const [fileClassName, fileClassAttributes] of ancestorsAttributes) {
                this.attributes.push(...fileClassAttributes.filter(attr => !this.attributes.map(_attr => _attr.name).includes(attr.name)))
            }
        } catch (error) {
            throw (error);
        }
    }

    public getVersion(): string {
        return this.plugin.app.metadataCache.getFileCache(this.getClassFile())?.frontmatter?.version
    }

    public getMajorVersion(): number | undefined {
        const version = this.getVersion();
        if (version) {
            //in v1 of fileClass, version was a number; in newer versions it is a string x.y
            const [x, y] = `${version}`.split(".")
            if (!y) return undefined
            return parseInt(x)
        } else {
            return undefined
        }
    }

    private async incrementVersion(): Promise<void> {
        const file = this.getClassFile()
        const currentVersion = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.version
        await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            if (currentVersion) {
                const [x, y] = currentVersion.split(".");
                fm.version = `${x}.${parseInt(y) + 1}`
            } else {
                fm.version = "2.0"
            }
        })
    }

    public async updateOptions(newOptions: FileClassOptions): Promise<void> {
        const file = this.getClassFile()
        await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            Object.keys(options).forEach(async (key: keyof typeof options) => {
                const { name, toValue } = options[key]
                fm[name] = toValue(newOptions[key as keyof FileClassOptions])
            })
        })
        await this.incrementVersion();
    }

    public async updateAttribute(
        newType: keyof typeof FieldType,
        newName: string,
        newOptions?: string[] | Record<string, string>,
        attr?: FileClassAttribute,
        newCommand?: FieldCommand,
        newDisplay?: MultiDisplayType,
        newStyle?: Record<keyof typeof FieldStyleLabel, boolean>,
        newParent?: string
    ): Promise<void> {
        const fileClass = attr ? this.plugin.fieldIndex.fileClassesName.get(attr.fileClassName)! : this
        const file = fileClass.getClassFile();
        await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            if (attr) {
                const field = fm.fields.find((f: FileClassAttribute) => f.id === attr.id)
                field.type = newType;
                if (newOptions) field.options = newOptions;
                if (newCommand) field.command = newCommand;
                if (newDisplay) field.display = newDisplay;
                if (newStyle) field.style = newStyle;
                if (newName) field.name = newName;
                if (newParent) field.parent = newParent
            } else {
                fm.fields.push({
                    name: newName,
                    type: newType,
                    options: newOptions,
                    command: newCommand,
                    display: newDisplay,
                    style: newStyle,
                    parent: newParent,
                    id: uuidv4()
                })
            }
        })
        await this.incrementVersion();
    }

    public async removeAttribute(attr: FileClassAttribute): Promise<void> {
        const file = this.getClassFile();
        await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            fm.fields = fm.fields.filter((f: any) => f.id !== attr.id)
        })
    }

    static createFileClass(plugin: MetadataMenu, name: string, excludeParent: boolean = false): FileClass {
        const fileClass = new FileClass(plugin, name);
        fileClass.options = fileClass.getFileClassOptions()
        fileClass.getAttributes();
        return fileClass
    }

    static getFileClassNameFromPath(plugin: MetadataMenu, path: string): string | undefined {
        const fileClassNameRegex = new RegExp(`${plugin.settings.classFilesPath}(?<fileClassName>.*).md`);
        return path.match(fileClassNameRegex)?.groups?.fileClassName
    }
}

export { FileClass };