import { FileClassAttribute } from "./fileClassAttribute";
import MetadataMenu from "main";
import { SuggestModal, TFile } from "obsidian";
import { FieldType, FieldTypeLabelMapping, MultiDisplayType } from "src/types/fieldTypes";
import { capitalize } from "src/utils/textUtils";
import Field, { FieldCommand } from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { postValues } from "src/commands/postValues";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { Note } from "src/note/note";
import FieldIndex from "src/index/FieldIndex";
import { MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import { SavedView } from "./views/tableViewComponents/saveViewModal";
import { insertMissingFields } from "src/commands/insertMissingFields";

const options: Record<string, { name: string, toValue: (value: any) => any }> = {
    "limit": { name: "limit", toValue: (value: any) => value },
    "mapWithTag": { name: "mapWithTag", toValue: (value: boolean) => value },
    "icon": { name: "icon", toValue: (value: any) => `${value || "file-spreadsheet"}` },
    "tagNames": { name: "tagNames", toValue: (values: string[]) => values.length ? values : null },
    "filesPaths": { name: "filesPaths", toValue: (values: string[]) => values.length ? values : null },
    "bookmarksGroups": { name: "bookmarksGroups", toValue: (values: string[]) => values.length ? values : null },
    "excludes": { name: "excludes", toValue: (values: FileClassAttribute[]) => values.length ? values.map(attr => attr.name) : null },
    "parent": { name: "extends", toValue: (value: FileClass) => value?.name || null },
    "savedViews": { name: "savedViews", toValue: (value: SavedView[]) => value },
    "favoriteView": { name: "favoriteView", toValue: (value?: string) => value || null }
}

export interface FileClassChild {
    name: string,
    path: string[],
    fileClass: FileClass
}

export interface FileClassOptions {
    limit: number,
    icon: string,
    parent?: FileClass;
    excludes?: Array<FileClassAttribute>;
    tagNames?: string[],
    mapWithTag: boolean,
    filesPaths?: string[],
    bookmarksGroups?: string[],
    savedViews?: SavedView[],
    favoriteView?: string | null
}

export class FileClassOptions {

    constructor(
        public limit: number,
        public icon: string,
        public parent?: FileClass,
        public excludes?: Array<FileClassAttribute>,
        public tagNames?: string[],
        public mapWithTag: boolean = false,
        public filesPaths?: string[],
        public bookmarksGroups?: string[],
        public savedViews?: SavedView[],
        public favoriteView?: string | null
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
        const fileClasses = [...this.plugin.fieldIndex.fileClassesName.keys()]
            .filter(fileClassName => !this.plugin.fieldIndex.filesFileClasses
                .get(this.file.path)?.map(fileClass => fileClass.name)
                .includes(fileClassName)
            )
            .filter(fileClassName => fileClassName.toLocaleLowerCase().contains(query.toLowerCase()))
            .sort();
        return fileClasses
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
        await postValues(this.plugin, [{ id: `fileclass-field-${fileClassAlias}`, payload: { value: newValue } }], this.file, -1)
        if (this.plugin.settings.autoInsertFieldsAtFileClassInsertion) {
            insertMissingFields(this.plugin, this.file, -1)
        }
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
            filesPaths: _filesPaths,
            bookmarksGroups: _bookmarksGroups,
            icon: _icon,
            savedViews: _savedViews,
            favoriteView: _favoriteView
        } = this.plugin.app.metadataCache.getFileCache(this.getClassFile())?.frontmatter as Record<string, any> || {}
        const index = this.plugin.fieldIndex
        const parent = index.fileClassesName.get(_parent);
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
        const filesPaths = FileClass.getFilesPathsFromFrontMatter(_filesPaths);
        const bookmarksGroups = FileClass.getBookmarksGroupsFromFrontMatter(_bookmarksGroups);
        const icon = typeof (_icon) === 'string' ? _icon : this.plugin.settings.fileClassIcon
        const savedViews: SavedView[] = _savedViews || [];
        const favoriteView: string | null = (typeof _favoriteView === "string" && _favoriteView !== "") ? _favoriteView : null
        return new FileClassOptions(limit, icon, parent, excludes, tagNames, mapWithTag, filesPaths, bookmarksGroups, savedViews, favoriteView);
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

    getIcon(): string {
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
        return icon || this.plugin.settings.fileClassIcon
    }

    public async missingFieldsForFileClass(file: TFile): Promise<boolean> {

        const note = await Note.buildNote(this.plugin, file)
        const currentFieldsIds: string[] = note.existingFields.map(_f => _f.field.id)

        const missingFields = this && file ?
            !this.plugin.fieldIndex.fileClassesFields.get(this.name)?.map(f => f.id).every(id => currentFieldsIds.includes(id)) :
            false
        return missingFields
    }

    public getViewChildren(name?: string): FileClassChild[] {
        if (!name) return []
        const childrenNames = this.getFileClassOptions().savedViews?.find(_view => _view.name === name)?.children || []
        return this.getChildren().filter(c => childrenNames.includes(c.name))
    }

    static getFileClassAttributes(plugin: MetadataMenu, fileClass: FileClass, excludes?: string[]): FileClassAttribute[] {
        const file = fileClass.getClassFile();
        const rawAttributes = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.fields || []
        const attributes: FileClassAttribute[] = [];
        rawAttributes.forEach((attr: any) => {
            const { name, id, type, options, command, display, style, path } = attr;
            const fieldType = FieldTypeLabelMapping[capitalize(type) as keyof typeof FieldType];
            attributes.push(new FileClassAttribute(plugin, this.name, name, id, fieldType, options, fileClass.name, command, display, style, path))
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

    static getFilesPathsFromFrontMatter(_filesPaths: string[] | string | undefined): string[] {
        if (Array.isArray(_filesPaths)) {
            return _filesPaths;
        } else if (_filesPaths) {
            return _filesPaths.split(",")
        } else {
            return []
        }
    }

    static getBookmarksGroupsFromFrontMatter(_bookmarksGroups: string[] | string | undefined): string[] {
        if (Array.isArray(_bookmarksGroups)) {
            return _bookmarksGroups;
        } else if (_bookmarksGroups) {
            return _bookmarksGroups.split(",")
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

    public getChildren(): FileClassChild[] {
        const childrenNames: FileClassChild[] = [];
        [...this.plugin.fieldIndex.fileClassesAncestors].forEach(([_fName, ancestors]) => {
            if (ancestors.includes(this.name)) {
                const path = [...ancestors.slice(0, ancestors.indexOf(this.name)).reverse(), _fName]
                const fileClass = this.plugin.fieldIndex.fileClassesName.get(_fName)
                if (fileClass) {
                    childrenNames.push({
                        name: _fName,
                        path: path,
                        fileClass: fileClass
                    })
                }
            }
        })
        return childrenNames
    }

    public async updateAttribute(
        newType: keyof typeof FieldType,
        newName: string,
        newOptions?: string[] | Record<string, string>,
        attr?: FileClassAttribute,
        newCommand?: FieldCommand,
        newDisplay?: MultiDisplayType,
        newStyle?: Record<keyof typeof FieldStyleLabel, boolean>,
        newPath?: string
    ): Promise<void> {
        const fileClass = attr ? this.plugin.fieldIndex.fileClassesName.get(attr.fileClassName)! : this
        const file = fileClass.getClassFile();
        await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            fm.fields = fm.fields || []
            if (attr) {
                const field = fm.fields.find((f: FileClassAttribute) => f.id === attr.id)
                field.type = newType;
                if (newOptions) field.options = newOptions;
                if (newCommand) field.command = newCommand;
                if (newDisplay) field.display = newDisplay;
                if (newStyle) field.style = newStyle;
                if (newName) field.name = newName;
                if (newPath !== undefined) field.path = newPath
            } else {
                fm.fields.push({
                    name: newName,
                    type: newType,
                    options: newOptions,
                    command: newCommand,
                    display: newDisplay,
                    style: newStyle,
                    path: newPath,
                    id: Field.getNewFieldId(this.plugin)
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

    static createFileClass(plugin: MetadataMenu, name: string): FileClass {
        const fileClass = new FileClass(plugin, name);
        fileClass.options = fileClass.getFileClassOptions()
        fileClass.getAttributes();
        return fileClass
    }

    static getFileClassNameFromPath(settings: MetadataMenuSettings, path: string): string | undefined {
        const fileClassNameRegex = new RegExp(`${settings.classFilesPath}(?<fileClassName>.*).md`);
        return path.match(fileClassNameRegex)?.groups?.fileClassName
    }

    static indexFileClass(index: FieldIndex, file: TFile): void {
        const fileClassName = FileClass.getFileClassNameFromPath(index.plugin.settings, file.path)
        if (fileClassName) {
            try {
                const fileClass = FileClass.createFileClass(index.plugin, fileClassName)
                index.fileClassesFields.set(
                    fileClassName,
                    fileClass.attributes.map(attr => attr.getField())
                )
                index.fileClassesPath.set(file.path, fileClass)
                index.fileClassesName.set(fileClass.name, fileClass)
                const cache = index.plugin.app.metadataCache.getFileCache(file);
                if (fileClass.getMajorVersion() === undefined || fileClass.getMajorVersion() as number < 2) {
                    index.v1FileClassesPath.set(file.path, fileClass)
                    index.remainingLegacyFileClasses = true
                } else if (fileClass.getMajorVersion() === 2) {
                    index.v2FileClassesPath.set(file.path, fileClass)
                    index.remainingLegacyFileClasses = true
                }
                /*
                ** Map with tags
                */
                if (cache?.frontmatter?.mapWithTag) {
                    if (!fileClassName.includes(" ")) {
                        index.tagsMatchingFileClasses.set(fileClassName, fileClass)
                    }
                }
                if (cache?.frontmatter?.tagNames) {
                    const _tagNames = cache?.frontmatter?.tagNames as string | string[];
                    const tagNames = Array.isArray(_tagNames) ? [..._tagNames] : _tagNames.split(",").map(t => t.trim())
                    tagNames.forEach(tag => {
                        if (!tag.includes(" ")) {
                            index.tagsMatchingFileClasses.set(tag, fileClass)
                        }
                    })
                }
                /*
                ** Map with files paths
                */
                if (cache?.frontmatter?.filesPaths) {
                    const _filesPaths = cache?.frontmatter?.filesPaths as string | string[];
                    const filesPaths = Array.isArray(_filesPaths) ? [..._filesPaths] : _filesPaths.split(",").map(f => f.trim())
                    filesPaths.forEach(path => index.filesPathsMatchingFileClasses.set(path, fileClass))
                }
                /*
                ** Map with bookmarks groups
                */
                if (cache?.frontmatter?.bookmarksGroups) {
                    const _bookmarksGroups = cache?.frontmatter?.bookmarksGroups as string | string[];
                    const bookmarksGroups = Array.isArray(_bookmarksGroups) ? [..._bookmarksGroups] : _bookmarksGroups.split(",").map(g => g.trim())
                    bookmarksGroups.forEach(group => index.bookmarksGroupsMatchingFileClasses.set(group, fileClass))
                }
            } catch (error) {
                console.error(error)
            }
        }
    }
}

export { FileClass };