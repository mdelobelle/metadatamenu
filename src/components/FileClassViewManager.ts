import MetadataMenu from "main";
import { Component, WorkspaceLeaf } from "obsidian";
import { FileClassView, FILECLASS_VIEW_TYPE } from "src/fileClass/views/fileClassView";
import { FileClass } from "../fileClass/fileClass";
import { FileClassChoiceModal } from "../fileClass/fileClassChoiceModal";

interface FileClassStoredView {
    id: string,
    leafId: string
}

export enum FileClassViewType {
    "tableOption" = "tableOption",
    "fieldsOption" = "fieldsOption",
    "settingsOption" = "settingsOption"
}

export class FileClassViewManager extends Component {
    public fileClassView: FileClassView;
    public fileClassViewType: string;
    public name: string;
    public tableId: string;
    public showAddField: boolean = false

    constructor(
        public plugin: MetadataMenu,
        public fileClass?: FileClass,
        public onOpenTabDisplay: keyof typeof FileClassViewType = "tableOption",
        public revealAfterOpen: boolean = true,
        public selectedView?: string
    ) {
        super();
        if (!this.fileClass) {
            this.fileClassViewType = FILECLASS_VIEW_TYPE
        } else {
            this.fileClassViewType = FILECLASS_VIEW_TYPE + "__" + this.fileClass.name
        }
    }

    private async openRegisterAndIndexView(fileClass: FileClass) {
        this.fileClass = fileClass;
        this.name = this.fileClass.name;
        this.fileClassViewType = FILECLASS_VIEW_TYPE + "__" + this.fileClass.name
        await this.openFileClassView();
        this.registerEvent(this.plugin.app.metadataCache.on("metadata-menu:fileclass-indexed", () => {
            const view = this.plugin.app.workspace.getLeavesOfType(this.fileClassViewType)[0]?.view as FileClassView | undefined
            if (view) {
                view.updateFieldsView();
                view.updateSettingsView();
                view.tableView.triggerRefreshNeeded();
            }
        }));

        this.registerEvent(this.plugin.app.metadataCache.on("metadata-menu:fields-changed", () => {
            const view = this.plugin.app.workspace.getLeavesOfType(this.fileClassViewType)[0]?.view as FileClassView | undefined
            if (view) {
                view.tableView.build();  // force refresh
                // view.tableView.update();
                // TODO: restore page and scrolling level
            }
        }));



        this.plugin.indexDB.fileClassViews.editElement(this.fileClassViewType, {
            id: this.fileClassViewType,
            leafId: this.fileClassView?.leaf.id
        })
    }

    public async build(): Promise<void> {
        if (this.fileClass) this.openRegisterAndIndexView(this.fileClass)
        else {
            const tagsAndFileClasses = this.getActiveFileTagsAndFileClasses();
            if (tagsAndFileClasses.length === 1) {
                const index = this.plugin.fieldIndex
                const fileClassName = tagsAndFileClasses[0];
                const fileClass = index.fileClassesName.get(fileClassName) || index.tagsMatchingFileClasses.get(fileClassName)
                if (fileClass) this.openRegisterAndIndexView(fileClass)
                else {
                    this.plugin.removeChild(this)
                    this.unload()
                }
            } else {
                const choiceModal = new FileClassChoiceModal(this.plugin, this, tagsAndFileClasses)
                choiceModal.onClose = () => {
                    if (!this.fileClass) {
                        this.plugin.removeChild(this)
                        this.unload()
                    }
                }
                choiceModal.open();
            }
        }
    }

    public async openFileClassView(): Promise<void> {
        if (this.fileClass) {
            const fileClass = this.fileClass
            this.plugin.app.workspace.detachLeavesOfType(this.fileClassViewType);
            this.plugin.registerView(this.fileClassViewType,
                (leaf: WorkspaceLeaf) => {
                    this.tableId = `table-container-${Math.floor(Date.now())}`
                    const fileClassView = new FileClassView(leaf, this.plugin, this.tableId, this, this.name, fileClass, this.onOpenTabDisplay, this.selectedView)
                    this.fileClassView = fileClassView;
                    return fileClassView
                }
            )

            //FIXME (P2) conflict with float-search that is overring getLeaf...
            try {
                //@ts-ignore
                await this.plugin.app.workspace.getLeaf('tab', 'vertical').setViewState({
                    type: this.fileClassViewType,
                    active: true
                });
                if (this.revealAfterOpen) {
                    this.plugin.app.workspace.revealLeaf(
                        this.plugin.app.workspace.getLeavesOfType(this.fileClassViewType).last()!
                    );
                }
            } catch (e) {
                console.log(e)
                this.unload()
                console.warn("Fileclass view couldn't load because of a conflict with another plugin")
            }
        }
    }

    private getActiveFileTagsAndFileClasses(): string[] {
        const index = this.plugin.fieldIndex
        const activeFilePath = this.plugin.app.workspace.getActiveFile()?.path
        const tagsAndFileClasses = []
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (activeFilePath && activeFilePath.endsWith(".md") && dvApi) {
            tagsAndFileClasses.push(...(dvApi.page(activeFilePath).etags?.filter((tag: string) => [...index.tagsMatchingFileClasses.keys()].includes(tag)) || []))
            tagsAndFileClasses.push(...(index.filesFileClassesNames.get(activeFilePath) || []))
        }
        return [...new Set(tagsAndFileClasses)]
    }

    onunload(): void {
        this.plugin.app.workspace.detachLeavesOfType(this.fileClassViewType);
        // @ts-ignore
        this.plugin.app.viewRegistry.unregisterView(this.fileClassViewType);
        this.plugin.indexDB.fileClassViews.removeElement(FILECLASS_VIEW_TYPE + "__" + this.name)
        for (const child of this._children) { child.unload(); this.removeChild(child) }
    }

    static async reloadViews(plugin: MetadataMenu): Promise<void> {
        const registeredFileClassViews = Object
            .keys(plugin.app.viewRegistry.viewByType)
            .filter(key => key.startsWith("FileClassView__"));
        for (const view of (await plugin.indexDB.fileClassViews.getElement("all") as FileClassStoredView[] || [])) {
            const fileClassName = /FileClassView__(.*)/.exec(view.id)?.[1]
            if (fileClassName && !registeredFileClassViews.some(viewName => viewName.includes(fileClassName))) {
                const leaf = plugin.app.workspace.getLeafById(view.leafId)
                const fileClass = plugin.fieldIndex.fileClassesName.get(fileClassName)
                if (fileClass) {
                    if (leaf && !(leaf.view.component instanceof FileClassViewManager)) plugin.app.workspace.detachLeavesOfType(view.id);
                    const fileClassManager = new FileClassViewManager(plugin, fileClass, "tableOption", false)
                    plugin.addChild(fileClassManager)
                    await fileClassManager.build()
                }
            }
        }
    }
}