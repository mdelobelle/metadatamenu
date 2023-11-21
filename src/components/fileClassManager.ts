import MetadataMenu from "main";
import { Component, WorkspaceLeaf } from "obsidian";
import { FileClassView, FILECLASS_VIEW_TYPE } from "src/fileClass/fileClassView";
import { FileClass } from "../fileClass/fileClass";
import { FileClassChoiceModal } from "../fileClass/fileClassChoiceModal";

export enum FileClassViewType {
    "tableOption" = "tableOption",
    "fieldsOption" = "fieldsOption",
    "settingsOption" = "settingsOption"
}

export class FileClassManager extends Component {
    public fileClassView: FileClassView;
    public fileClassViewType: string;
    public name: string;

    constructor(
        public plugin: MetadataMenu,
        public fileClass?: FileClass,
        public onOpenTabDisplay: keyof typeof FileClassViewType = "tableOption"
    ) {
        super();
        if (!this.fileClass) {
            this.fileClassViewType = FILECLASS_VIEW_TYPE
        } else {
            this.fileClassViewType = FILECLASS_VIEW_TYPE + "__" + this.fileClass.name
        }
    }

    async onload(): Promise<void> {

        if (this.fileClass) {
            this.name = this.fileClass.name;
            this.fileClassViewType = FILECLASS_VIEW_TYPE + "__" + this.fileClass.name
            await this.openFileClassView();
            this.registerIndexingDone()
        } else {
            const tagsAndFileClasses = this.getActiveFileTagsAndFileClasses();
            if (tagsAndFileClasses.length === 1) {
                const index = this.plugin.fieldIndex
                const fileClassName = tagsAndFileClasses[0];
                const fileClass = index.fileClassesName.get(fileClassName) || index.tagsMatchingFileClasses.get(fileClassName)
                if (fileClass) {
                    this.name = fileClass.name;
                    this.fileClass = fileClass;
                    this.fileClassViewType = FILECLASS_VIEW_TYPE + "__" + fileClass.name
                    await this.openFileClassView();
                    this.registerIndexingDone()
                } else {
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

    onunload(): void {
        this.plugin.app.workspace.detachLeavesOfType(this.fileClassViewType);
        // @ts-ignore
        this.plugin.app.viewRegistry.unregisterView(this.fileClassViewType);
    }

    private registerIndexingDone() {
        this.registerEvent(this.plugin.app.workspace.on("metadata-menu:indexed", () => {
            const view = this.plugin.app.workspace.getLeavesOfType(this.fileClassViewType)[0]?.view as FileClassView | undefined
            if (view) {
                view.updateFieldsView();
                view.updateSettingsView();
                view.tableView.buildTable();
            }
        }));
    }

    public async openFileClassView(): Promise<void> {
        if (this.fileClass) {
            const fileClass = this.fileClass
            this.plugin.app.workspace.detachLeavesOfType(this.fileClassViewType);

            this.plugin.registerView(this.fileClassViewType,
                (leaf: WorkspaceLeaf) => {
                    const fileClassView = new FileClassView(leaf, this.plugin, this, this.name, fileClass, this.onOpenTabDisplay)
                    this.fileClassView = fileClassView;
                    return fileClassView
                }
            )

            //@ts-ignore
            await this.plugin.app.workspace.getLeaf('tab', 'vertical').setViewState({
                type: this.fileClassViewType,
                active: true
            });
            this.plugin.app.workspace.revealLeaf(
                this.plugin.app.workspace.getLeavesOfType(this.fileClassViewType).last()!
            );
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
}