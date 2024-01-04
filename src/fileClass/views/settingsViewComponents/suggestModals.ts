import { SuggestModal, TAbstractFile, TFolder } from "obsidian"
import { FileClassSettingsView } from "../fileClassSettingsView"
import MetadataMenu from "main"
import { BookmarkItem } from "src/typings/types"

export class ParentSuggestModal extends SuggestModal<string> {

    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
    }

    getSuggestions(query: string): string[] {
        const fileClassesNames = [...this.view.plugin.fieldIndex.fileClassesName.keys()] as string[]
        const currentName = this.view.fileClass.name
        return fileClassesNames
            .sort()
            .filter(name => name !== currentName && name.toLowerCase().includes(query.toLowerCase()))
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const options = this.view.fileClass.getFileClassOptions()
        const parent = this.view.plugin.fieldIndex.fileClassesName.get(item)
        if (parent) {
            options.parent = parent
            this.view.fileClass.updateOptions(options)
        }
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
    }
}

export class TagSuggestModal extends SuggestModal<string> {

    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
    }

    getSuggestions(query: string): string[] {
        //@ts-ignore
        const tags = Object.keys(this.view.plugin.app.metadataCache.getTags())
        return tags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const options = this.view.fileClass.getFileClassOptions()
        const tagNames = options.tagNames || []
        tagNames.push(item.replace(/^#(.*)/, "$1"))
        options.tagNames = tagNames
        this.view.fileClass.updateOptions(options)

    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
    }
}

export class FieldSuggestModal extends SuggestModal<string> {

    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
    }

    getSuggestions(query: string): string[] {
        const fileClassName = this.view.fileClass.name
        const fileClassFields = this.view.plugin.fieldIndex.fileClassesFields.get(fileClassName) || []
        const excludedFields = this.view.fileClass.getFileClassOptions().excludes
        return fileClassFields
            .filter(fCA =>
                fCA.fileClassName !== fileClassName
                && fCA.fileClassName?.toLowerCase().includes(query.toLowerCase())
                && !excludedFields?.map(attr => attr.name).includes(fCA.name)
            )
            .map(fCA => fCA.name)
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const options = this.view.fileClass.getFileClassOptions()
        const excludedFields = options.excludes || []
        const excludedField = this.view.fileClass.attributes.find(field => field.name === item)
        if (excludedField) {
            excludedFields.push(excludedField)
            options.excludes = excludedFields
            this.view.fileClass.updateOptions(options)
        }
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
    }
}

export class PathSuggestModal extends SuggestModal<string> {
    private plugin: MetadataMenu
    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
        this.plugin = view.plugin
    }

    getSuggestions(query: string): string[] {
        const abstractFiles = this.plugin.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (
                folder instanceof TFolder &&
                folder.path.toLowerCase().contains(query.toLowerCase())
            ) {
                folders.push(folder);
            }
        });

        return folders.map(f => f.path);
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const options = this.view.fileClass.getFileClassOptions()
        const filesPaths = options.filesPaths || []
        filesPaths.push(item)
        options.filesPaths = filesPaths
        this.view.fileClass.updateOptions(options)

    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
    }
}

export class BookmarksGroupSuggestModal extends SuggestModal<string> {
    private plugin: MetadataMenu
    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
        this.plugin = view.plugin
    }

    private getGroups = (items: BookmarkItem[], groups: string[] = [], path: string = "") => {
        for (const item of items) {
            if (item.type === "group") {
                const subPath = `${path}${path ? "/" : ""}${item.title}`
                groups.push(subPath)
                if (item.items) this.getGroups(item.items, groups, subPath)
            }
        }
    }

    getSuggestions(query: string): string[] {
        //@ts-ignore

        const bookmarks = this.plugin.fieldIndex.bookmarks
        const groups: string[] = ["/"]
        if (bookmarks.enabled) this.getGroups(bookmarks.instance.items, groups)
        return groups
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        const options = this.view.fileClass.getFileClassOptions()
        const bookmarksGroups = options.bookmarksGroups || []
        bookmarksGroups.push(item)
        options.bookmarksGroups = bookmarksGroups
        this.view.fileClass.updateOptions(options)

    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
    }
}