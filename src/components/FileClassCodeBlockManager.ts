import MetadataMenu from "main";
import { EventRef, MarkdownPostProcessorContext, MarkdownRenderChild, parseYaml } from "obsidian";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassCodeBlockView } from "src/fileClass/views/fileClassCodeBlockView";

export enum FileClassViewType {
    "table" = "table"
}

export class FileClassCodeBlockManager extends MarkdownRenderChild {
    public fileClassCodeBlockView: FileClassCodeBlockView;
    public itemsPerPage: number
    public startAtItem: number
    public fileClass: FileClass | undefined
    public tableId: string
    public isLoaded: boolean = false
    public showAddField: boolean = false
    private indexEventRef: EventRef | null = null

    constructor(
        public plugin: MetadataMenu,
        public containerEl: HTMLElement,
        public source: string,
        public ctx: MarkdownPostProcessorContext
    ) {
        super(containerEl);
    }

    public build() {
        const el = this.containerEl
        const source = this.source
        try {
            const content = parseYaml(source)
            const fileClassName = content[this.plugin.settings.fileClassAlias]
            const selectedView = content.view?.toString() as string | undefined
            this.fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            if (this.fileClass) {
                // Only modify DOM after confirming fileClass exists
                // to prevent destroying page content on failure
                el.replaceChildren()
                el.addClass("metadata-menu")
                el.addClass("fileclass-codeblock-view")
                const container = el.createDiv({ cls: "fv-table" })
                const header = container.createDiv({ cls: "options" })
                const paginationContainer = header.createDiv({ cls: "pagination" });
                this.tableId = `table-container-${Math.floor(Date.now())}`
                const tableContainer = container.createDiv({ attr: { id: this.tableId } })
                container.createDiv()
                this.itemsPerPage = content["files per page"] || this.fileClass.options.limit || this.plugin.settings.tableViewMaxRecords
                this.startAtItem = content["start"] || 0
                this.showAddField = content["showAddField"] === true || false
                this.fileClassCodeBlockView = new FileClassCodeBlockView(this, this.tableId, this.fileClass, paginationContainer, tableContainer, selectedView, this.ctx)
                this.fileClassCodeBlockView.fileClassDataviewTable.limit = this.itemsPerPage
                // Call buidFileClassViewBtn directly instead of via
                // registerMarkdownPostProcessor to avoid rendering conflicts
                // in reading view
                try {
                    this.fileClassCodeBlockView.fileClassDataviewTable.buidFileClassViewBtn()
                } catch (e) {
                    // buidFileClassViewBtn may fail if DOM is not ready yet; safe to ignore
                }
                this.fileClassCodeBlockView.update(this.itemsPerPage, this.startAtItem)
                this.isLoaded = true
                this.unregisterIndexEvent()
            } else {
                // fileClass may not be indexed yet; listen for the indexing
                // event and rebuild when it fires (same pattern as
                // FileClassViewManager)
                if (!this.indexEventRef) {
                    this.indexEventRef = this.plugin.app.metadataCache.on(
                        "metadata-menu:fileclass-indexed",
                        () => { this.build() }
                    )
                    this.registerEvent(this.indexEventRef)
                }
            }
        } catch (e) {
            el.setText(e)
        }
    }

    private unregisterIndexEvent() {
        if (this.indexEventRef) {
            this.plugin.app.metadataCache.offref(this.indexEventRef)
            this.indexEventRef = null
        }
    }

    onload(): void {
        this.build()
    }

    onunload(): void {
        this.unregisterIndexEvent()
        this.plugin.codeBlockListManager.removeChild(this)
    }

}