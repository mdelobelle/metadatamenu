import MetadataMenu from "main";
import { FileClassDataviewTable } from "./tableViewComponents/fileClassDataviewTable";
import { FileClass, FileClassChild } from "../fileClass";
import { ViewConfiguration } from "./tableViewComponents/tableViewFieldSet";
import { MarkdownPostProcessorContext } from "obsidian";
import { FileClassCodeBlockManager } from "src/components/FileClassCodeBlockManager";

export class FileClassCodeBlockView {
    public fileClassDataviewTable: FileClassDataviewTable
    public viewConfiguration: ViewConfiguration
    public plugin: MetadataMenu

    constructor(
        public manager: FileClassCodeBlockManager,
        public tableId: string,
        public fileClass: FileClass,
        public paginationContainer: HTMLDivElement,
        public tableContainer: HTMLDivElement,
        public selectedView?: string | undefined,
        public ctx?: MarkdownPostProcessorContext,
        public children: FileClassChild[] = []
    ) {
        this.plugin = this.manager.plugin
        this.viewConfiguration = this.getViewConfig()
        this.fileClassDataviewTable = new FileClassDataviewTable(this.viewConfiguration, this, fileClass)
    }

    private getViewConfig(): ViewConfiguration {
        const options = this.fileClass.getFileClassOptions()
        const columns = [{
            id: "file",
            name: "file",
            hidden: false,
            position: 0
        }]

        const sortedFields = FileClass.getSortedRootFields(this.plugin, this.fileClass)
        for (const [_index, f] of sortedFields.entries()) {
            columns.push({
                id: `${this.fileClass.name}____${f.name}`,
                name: f.name,
                hidden: false,
                position: _index + 1
            })
        }
        const defaultConfig = {
            children: [],
            filters: [],
            sorters: [],
            columns: columns
        }
        const partialViewConfig = options.savedViews?.find(view => view.name === this.selectedView) || defaultConfig
        return {
            children: partialViewConfig.children || [],
            filters: partialViewConfig.filters,
            sorters: partialViewConfig.sorters,
            columns: partialViewConfig.columns,
        }
    }

    public update(maxRows?: number, sliceStart: number = 0): void {
        this.fileClassDataviewTable = new FileClassDataviewTable(
            this.viewConfiguration, this, this.fileClass, maxRows, sliceStart, this.ctx)
        this.fileClassDataviewTable.buildTable(this.tableContainer);
        this.fileClassDataviewTable.buildPaginationManager(this.paginationContainer);
    }
}