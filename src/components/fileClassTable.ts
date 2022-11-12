import MetadataMenu from "main";
import { Component, ItemView, TextFileView, View, WorkspaceLeaf } from "obsidian";
import { FileClass } from "../fileClass/fileClass";
import { FileClassChoiceModal } from "../fileClass/fileClassChoiceModal";

export const FILECLASS_TABLE_VIEW_TYPE = "FileClassTableView"

export class FileClassTableView extends ItemView {

    constructor(
        public leaf: WorkspaceLeaf,
        private plugin: MetadataMenu,
        private component: FileClassComponent,
        public name?: string,
        public fileClass?: FileClass
    ) {
        super(leaf)
        this.containerEl.addClass("metadata-menu")
        this.navigation = false;
        this.icon = "file-spreadsheet"
        this.onunload = () => {
            //@ts-ignore
            this.plugin.app.viewRegistry.unregisterView(FILECLASS_TABLE_VIEW_TYPE + "__" + this.fileClass.name);
            this.plugin.removeChild(this.component)
            this.unload()
        }
    }


    getDisplayText(): string {
        return this.name || "FileClass"
    }

    getViewType(): string {
        return this.fileClass ? FILECLASS_TABLE_VIEW_TYPE + "__" + this.fileClass.name : FILECLASS_TABLE_VIEW_TYPE
    }

    protected async onOpen(): Promise<void> {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        this.icon = this.fileClass?.getIcon() || "file-spreadsheet"
        if (dvApi) {
            dvApi.executeJs(this.buildDvJSQuery(), this.contentEl, this, "")
        }
    }

    public buildDvJSQuery(): string | undefined {
        if (this.fileClass) {
            const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name) || []
            let dvQuery = "const {fieldModifier: f} = this.app.plugins.plugins[\"metadata-menu\"].api;\n" +
                "dv.table([\"File\",";
            dvQuery += fields.map(field => `"${field.name}"`).join(",");
            dvQuery += `], dv.pages()\n`
            dvQuery += `    .where(p => p.fileClass === '${this.name}' || p.file.etags.values.includes('#${this.name}'))\n`
            dvQuery += "    .map(p => [\n        p.file.link,\n";
            dvQuery += fields.map(field => `        f(dv, p, "${field.name}", {options: {alwaysOn: false, showAddField: true}})`).join(",\n");
            dvQuery += "    \n])\n);"
            return dvQuery
        }
    }
}

export class FileClassComponent extends Component {
    public fileClassTableView: FileClassTableView;
    public fileClassTableViewType: string;
    public name: string;

    constructor(
        public plugin: MetadataMenu,
        public fileClass?: FileClass
    ) {
        super();
        if (!this.fileClass) {
            this.fileClassTableViewType = FILECLASS_TABLE_VIEW_TYPE
        } else {
            this.fileClassTableViewType = FILECLASS_TABLE_VIEW_TYPE + "__" + this.fileClass.name
        }
    }

    async onload(): Promise<void> {

        if (this.fileClass) {
            this.name = this.fileClass.name;
            this.fileClassTableViewType = FILECLASS_TABLE_VIEW_TYPE + "__" + this.fileClass.name
            await this.openTableView();
        } else {
            const tagsAndFileClasses = this.getActiveFileTagsAndFileClasses();
            if (tagsAndFileClasses.length === 1) {
                const index = this.plugin.fieldIndex
                const fileClassName = tagsAndFileClasses[0];
                const fileClass = index.fileClassesName.get(fileClassName) || index.tagsMatchingFileClasses.get(fileClassName)
                if (fileClass) {
                    this.name = fileClass.name;
                    this.fileClass = fileClass;
                    this.fileClassTableViewType = FILECLASS_TABLE_VIEW_TYPE + "__" + fileClass.name
                    await this.openTableView();
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
        this.plugin.app.workspace.detachLeavesOfType(this.fileClassTableViewType);
        // @ts-ignore
        this.plugin.app.viewRegistry.unregisterView(this.fileClassTableViewType);
    }

    public async openTableView(): Promise<void> {
        this.plugin.app.workspace.detachLeavesOfType(this.fileClassTableViewType);

        this.plugin.registerView(this.fileClassTableViewType,
            (leaf: WorkspaceLeaf) => new FileClassTableView(leaf, this.plugin, this, this.name, this.fileClass)
        )

        //@ts-ignore
        await this.plugin.app.workspace.getLeaf('tab', 'vertical').setViewState({
            type: this.fileClassTableViewType,
            active: true
        });

        this.plugin.app.workspace.revealLeaf(
            this.plugin.app.workspace.getLeavesOfType(this.fileClassTableViewType).last()!
        );
    }

    private getActiveFileTagsAndFileClasses(): string[] {
        const index = this.plugin.fieldIndex
        const activeFilePath = this.plugin.app.workspace.getActiveFile()?.path
        const tagsAndFileClasses = []
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (activeFilePath && dvApi) {
            tagsAndFileClasses.push(...(dvApi.page(activeFilePath).etags?.filter((tag: string) => [...index.tagsMatchingFileClasses.keys()].includes(tag)) || []))
            tagsAndFileClasses.push(...(index.filesFileClassesNames.get(activeFilePath) || []))
        }
        return [...new Set(tagsAndFileClasses)]
    }
}