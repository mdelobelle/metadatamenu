import MetadataMenu from "main";
import { ButtonComponent, MarkdownRenderer, setIcon, SuggestModal, TAbstractFile, TextComponent, TFolder, ToggleComponent } from "obsidian";
import { BookmarkItem } from "types";
import { FileClass, FileClassOptions } from "./fileClass";

class ParentSuggestModal extends SuggestModal<string> {

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

class TagSuggestModal extends SuggestModal<string> {

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

class FieldSuggestModal extends SuggestModal<string> {

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

class PathSuggestModal extends SuggestModal<string> {
    private plugin: MetadataMenu
    constructor(private view: FileClassSettingsView) {
        super(view.plugin.app)
        this.plugin = view.plugin
    }

    getSuggestions(query: string): string[] {
        const abstractFiles = this.plugin.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = query.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (
                folder instanceof TFolder &&
                folder.path.toLowerCase().contains(lowerCaseInputStr)
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

class BookmarksGroupSuggestModal extends SuggestModal<string> {
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

class FileClassSetting {
    private plugin: MetadataMenu;

    constructor(
        private container: HTMLElement,
        private label: string,
        private toolTipText: string,
        private buildOptionAndAction: (action: HTMLDivElement) => void,
    ) {
        this.buildSetting()
    };

    private buildSetting(): void {

        this.container.createDiv({ text: this.label, cls: "label" })
        const toolTipBtnContainer = this.container.createDiv({ cls: "tooltip-btn" });
        const tooltipBtn = new ButtonComponent(toolTipBtnContainer)
            .setIcon("help-circle")
            .setClass("tooltip-button")
        const action = this.container.createDiv({ cls: "action" })
        this.buildOptionAndAction(action);
        const tooltip = this.container.createDiv({ cls: "tooltip-text" });
        tooltip.innerHTML = this.toolTipText
        tooltip.hide();
        tooltipBtn.buttonEl.onmouseover = () => tooltip.show();
        tooltipBtn.buttonEl.onmouseout = () => tooltip.hide();
    };
}

export class FileClassSettingsView {
    public plugin: MetadataMenu;
    public container: HTMLDivElement
    private fileClassOptions: FileClassOptions
    private saveBtn: HTMLButtonElement

    constructor(
        plugin: MetadataMenu,
        private viewContainer: HTMLDivElement,
        public fileClass: FileClass
    ) {
        this.plugin = plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-settings" })
        this.buildSettings();
    };

    public buildSettings(): void {
        this.fileClassOptions = this.fileClass.getFileClassOptions()
        this.container.replaceChildren();
        const settingsContainer = this.container.createDiv({ cls: "settings-container" })
        new FileClassSetting(
            settingsContainer,
            "Max records per page",
            "Maximum lines displayed per page in the table view",
            (action: HTMLDivElement) => this.buildLimitComponent(action)
        );
        new FileClassSetting(
            settingsContainer,
            "Map with tag",
            `Bind tags with ${this.plugin.settings.fileClassAlias}<br/>` +
            `If Tag Names are empty this fileClass will be bound with the tag of same name`,
            (action: HTMLDivElement) => this.buildMapWithTagComponent(action)
        )
        new FileClassSetting(
            settingsContainer,
            "Button Icon",
            "Name of the icon for the metadata menu button<br/>(lucide.dev)",
            (action: HTMLDivElement) => this.buildIconComponent(action)
        )
        new FileClassSetting(
            settingsContainer,
            "Tag Names",
            `Names of tags to bind this ${this.plugin.settings.fileClassAlias} with`,
            (action: HTMLDivElement) => this.buildBindingComponent(action, this.fileClassOptions.tagNames, TagSuggestModal)
        )
        new FileClassSetting(
            settingsContainer,
            "Files paths",
            `Paths of files to bind this ${this.plugin.settings.fileClassAlias} with`,
            (action: HTMLDivElement) => this.buildBindingComponent(action, this.fileClassOptions.filesPaths, PathSuggestModal)
        )
        new FileClassSetting(
            settingsContainer,
            "Bookmarks groups",
            `Names group of bookmarked files to bind this ${this.plugin.settings.fileClassAlias} with`,
            (action: HTMLDivElement) => this.buildBindingComponent(action, this.fileClassOptions.bookmarksGroups, BookmarksGroupSuggestModal)
        )
        new FileClassSetting(
            settingsContainer,
            "Parent Fileclass",
            "Choose a fileClass to inherit fields from",
            (action: HTMLDivElement) => this.buildExtendComponent(action)
        )
        new FileClassSetting(
            settingsContainer,
            "Excluded Fields",
            `Names of fields to exclude from ancestor fileclasses`,
            (action: HTMLDivElement) => this.buildExcludesComponent(action)
        )
        this.buildSaveBtn();
        this.saveBtn.removeClass("active")
    }

    private buildSaveBtn(): void {
        const footer = this.container.createDiv({ cls: "footer" });
        const btnContainer = footer.createDiv({ cls: "cell" })
        this.saveBtn = btnContainer.createEl('button');
        setIcon(this.saveBtn, "save")
        this.saveBtn.onclick = async () => {
            await this.fileClass.updateOptions(this.fileClassOptions);
        }
    }

    private buildLimitComponent(action: HTMLDivElement): void {
        const input = new TextComponent(action)
        input.setValue(`${this.fileClassOptions.limit}`)
        input.onChange((value) => {
            this.saveBtn.addClass("active");
            this.fileClassOptions.limit = parseInt(value) || this.fileClassOptions.limit;
        })
    }

    private buildMapWithTagComponent(action: HTMLDivElement): void {
        const toggler = new ToggleComponent(action);
        toggler.setValue(this.fileClassOptions.mapWithTag)
        toggler.onChange((value) => {
            this.saveBtn.addClass("active");
            this.fileClassOptions.mapWithTag = value;
        })
    }

    private buildIconComponent(action: HTMLDivElement): void {
        const iconManagerContainer = action.createDiv({ cls: "icon-manager" })
        const input = new TextComponent(iconManagerContainer);
        const iconContainer = iconManagerContainer.createDiv({})
        input.setValue(this.fileClassOptions.icon);
        setIcon(iconContainer, this.fileClassOptions.icon);
        input.onChange((value) => {
            this.saveBtn.addClass("active");
            this.fileClassOptions.icon = value;
            setIcon(iconContainer, this.fileClassOptions.icon);
        })
    }


    private buildBindingComponent(
        action: HTMLDivElement,
        boundItemsNames: string[] | undefined,
        suggestModal: typeof PathSuggestModal | typeof TagSuggestModal | typeof BookmarksGroupSuggestModal
    ): void {
        const itemsContainer = action.createDiv({ cls: "items" })
        boundItemsNames?.forEach(item => {
            const itemContainer = itemsContainer.createDiv({ cls: "item chip", text: item })
            new ButtonComponent(itemContainer)
                .setIcon("x-circle")
                .setClass("item-remove")
                .onClick(async () => {
                    boundItemsNames?.remove(item)
                    await this.fileClass.updateOptions(this.fileClassOptions);
                })
        })
        const addBtn = itemsContainer.createEl('button', { cls: "item add" })
        setIcon(addBtn, "plus-circle")
        addBtn.onclick = () => {
            new suggestModal(this).open();
        }
    }

    private buildExcludesComponent(action: HTMLDivElement): void {
        const fieldsContainer = action.createDiv({ cls: "items" })
        this.fileClassOptions.excludes?.forEach(field => {
            const fieldontainer = fieldsContainer.createDiv({ cls: "item chip", text: field.name })
            new ButtonComponent(fieldontainer)
                .setIcon("x-circle")
                .setClass("item-remove")
                .onClick(async () => {
                    const excludedFields = this.fileClassOptions.excludes?.filter(attr => attr.name !== field.name)
                    this.fileClassOptions.excludes = excludedFields
                    await this.fileClass.updateOptions(this.fileClassOptions);
                })
        })
        const fieldAddBtn = fieldsContainer.createEl('button', { cls: "item" })
        setIcon(fieldAddBtn, "plus-circle")
        fieldAddBtn.onclick = () => {
            new FieldSuggestModal(this).open();
        }
    }

    private buildExtendComponent(action: HTMLDivElement): void {
        const parentManagerContainer = action.createDiv({ cls: "items" })
        const parentLinkContainer = parentManagerContainer.createDiv({ cls: "item" })
        const parent = this.fileClassOptions.parent
        if (parent) {
            const path = this.fileClass.getClassFile().path
            const component = this.plugin
            MarkdownRenderer.renderMarkdown(`[[${parent.name}]]`, parentLinkContainer, path, component)
            parentLinkContainer.querySelector("a.internal-link")?.addEventListener("click", (e) => {
                this.plugin.app.workspace.openLinkText(
                    //@ts-ignore
                    e.target.getAttr("data-href").split("/").last()?.replace(/(.*).md/, "$1"),
                    path,
                    //@ts-ignore
                    'tab'
                )
            })
        }
        parentManagerContainer.createDiv({ cls: "item spacer" })
        if (parent) {
            const parentRemoveBtn = parentManagerContainer.createEl('button', { cls: "item" })
            setIcon(parentRemoveBtn, "trash")
            parentRemoveBtn.onclick = async () => {
                delete (this.fileClassOptions.parent);
                await this.fileClass.updateOptions(this.fileClassOptions)
            }
        }
        const parentChangeBtn = parentManagerContainer.createEl('button', { cls: "item right-align" })
        setIcon(parentChangeBtn, "edit")
        parentChangeBtn.onclick = () => {
            new ParentSuggestModal(this).open();
        }
    }
}