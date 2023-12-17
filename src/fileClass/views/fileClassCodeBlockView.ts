import MetadataMenu from "main";
import { FileClassDataviewTable } from "./tableViewComponents/fileClassDataviewTable";
import { FileClass } from "../fileClass";
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
        public ctx?: MarkdownPostProcessorContext
    ) {
        this.plugin = this.manager.plugin
        this.viewConfiguration = this.getViewConfig()
        this.fileClassDataviewTable = new FileClassDataviewTable(this.viewConfiguration, this, fileClass)
    }

    private getViewConfig(): ViewConfiguration {
        const options = this.fileClass.getFileClassOptions()
        const defaultConfig = {
            filters: [],
            sorters: [],
            columns: [{
                id: "file",
                name: "file",
                hidden: false,
                position: 0
            }].concat(this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.filter(f => f.isRoot()).map((f, index) => {
                return {
                    id: f.id,
                    name: f.name,
                    hidden: false,
                    position: index + 1
                }
            }) || [])
        }
        return options.savedViews?.find(view => view.name === this.selectedView) || defaultConfig

    }

    public update(maxRows?: number, sliceStart: number = 0): void {
        this.fileClassDataviewTable = new FileClassDataviewTable(
            this.viewConfiguration, this, this.fileClass, maxRows, sliceStart, this.ctx)
        this.fileClassDataviewTable.buildTable(this.tableContainer);
        this.fileClassDataviewTable.buildPaginationManager(this.paginationContainer);
    }
}