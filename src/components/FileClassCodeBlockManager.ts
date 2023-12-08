import MetadataMenu from "main";
import { Component, parseYaml } from "obsidian";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassCodeBlockView } from "src/fileClass/fileClassCodeBlockView";

export enum FileClassViewType {
    "table" = "table"
}

export class FileClassCodeBlockManager extends Component {
    public fileClassCodeBlockView: FileClassCodeBlockView;
    public itemsPerPage: number
    public startAtItem: number
    public fileClass: FileClass | undefined

    constructor(
        public plugin: MetadataMenu,
        public el: HTMLElement,
        public source: string,
    ) { super(); }

    public build(el: HTMLElement, source: string) {
        el.addClass("metadata-menu")
        el.addClass("fileclass-codeblock-view")
        const container = el.createDiv({ cls: "fv-table" })
        const header = container.createDiv({ cls: "options" })
        const paginationContainer = header.createDiv({ cls: "pagination" });
        const tableId = `table-container-${Math.floor(Date.now() / 1000)}`
        const tableContainer = container.createDiv({ attr: { id: tableId } })
        container.createDiv()
        try {
            const content = parseYaml(source)
            const fileClassName = content.fileClass
            const selectedView = content.view
            this.fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            if (this.fileClass) {
                this.itemsPerPage = content["files per page"] || this.fileClass.options.limit || this.plugin.settings.tableViewMaxRecords
                this.startAtItem = content["start"] || 0
                this.fileClassCodeBlockView = new FileClassCodeBlockView(this.plugin, tableId, this.fileClass, paginationContainer, tableContainer, selectedView)
                this.fileClassCodeBlockView.fileClassDataviewTable.limit = this.itemsPerPage
                this.plugin.registerMarkdownPostProcessor((el, ctx) => {
                    this.fileClassCodeBlockView.fileClassDataviewTable.buidFileClassViewBtn()
                })
                this.fileClassCodeBlockView.update(this.itemsPerPage, this.startAtItem)
            } else {
                el.setText(`${fileClassName} isn't a proper fileclass`)
            }
        } catch (e) {
            el.setText(e)
        }
    }

    onload(): void {
        this.build(this.el, this.source)

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("metadata-menu:indexed", () => {
                if (!this.fileClassCodeBlockView || !this.fileClass) {
                    this.el.replaceChildren()
                    this.build(this.el, this.source)
                }
            })
        )
    }

    onunload(): void {
        this.el.replaceChildren()
    }
}