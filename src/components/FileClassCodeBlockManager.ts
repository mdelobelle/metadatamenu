import MetadataMenu from "main";
import { Component, MarkdownPostProcessorContext, MarkdownRenderChild, parseYaml } from "obsidian";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassCodeBlockView } from "src/fileClass/views/fileClassCodeBlockView";
import { DataviewJSRenderer } from "obsidian";

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
        el.replaceChildren()
        el.addClass("metadata-menu")
        el.addClass("fileclass-codeblock-view")
        const container = el.createDiv({ cls: "fv-table" })
        const header = container.createDiv({ cls: "options" })
        const paginationContainer = header.createDiv({ cls: "pagination" });
        this.tableId = `table-container-${Math.floor(Date.now())}`
        const tableContainer = container.createDiv({ attr: { id: this.tableId } })
        container.createDiv()
        try {
            const content = parseYaml(source)
            const fileClassName = content[this.plugin.settings.fileClassAlias]
            const selectedView = content.view?.toString() as string | undefined
            this.fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            if (this.fileClass) {
                this.itemsPerPage = content["files per page"] || this.fileClass.options.limit || this.plugin.settings.tableViewMaxRecords
                this.startAtItem = content["start"] || 0
                this.fileClassCodeBlockView = new FileClassCodeBlockView(this.plugin, this.tableId, this.fileClass, paginationContainer, tableContainer, selectedView, this.ctx)
                this.fileClassCodeBlockView.fileClassDataviewTable.limit = this.itemsPerPage
                this.plugin.registerMarkdownPostProcessor((el, ctx) => {
                    this.fileClassCodeBlockView.fileClassDataviewTable.buidFileClassViewBtn()
                })
                this.fileClassCodeBlockView.update(this.itemsPerPage, this.startAtItem)
                this.isLoaded = true
            } else {
                el.setText(`${fileClassName} isn't a proper fileclass`)
            }
        } catch (e) {
            el.setText(e)
        }
    }

    onload(): void {
        this.build()
    }

    onunload(): void {
        this.plugin._children.filter(child => child.hasOwnProperty("script") && child.containerEl.getAttr("id") === this.tableId)
            .forEach(child => {
                this.plugin.removeChild(child)
            })
    }
}