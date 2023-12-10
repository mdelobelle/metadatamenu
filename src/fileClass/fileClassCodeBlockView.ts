import MetadataMenu from "main";
import { FileClassDataviewTable } from "./fileClassDataviewTable";
import { FileClass } from "./fileClass";
import { ViewConfiguration } from "./tableViewFieldSet";

export class FileClassCodeBlockView {
    public fileClassDataviewTable: FileClassDataviewTable
    public viewConfiguration: ViewConfiguration

    constructor(
        public plugin: MetadataMenu,
        public tableId: string,
        public fileClass: FileClass,
        public paginationContainer: HTMLDivElement,
        public tableContainer: HTMLDivElement,
        public selectedView?: string | undefined
    ) {
        this.viewConfiguration = this.getViewConfig()
        this.fileClassDataviewTable = new FileClassDataviewTable(this.plugin, this.viewConfiguration, this, fileClass)
    }

    private getViewConfig(): ViewConfiguration {
        const options = this.fileClass.getFileClassOptions()
        const defaultConfig = {
            filters: [],
            sorters: [],
            columns: [{
                name: "file",
                hidden: false,
                position: 0
            }].concat(this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.filter(f => f.isRoot()).map((f, index) => {
                return {
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
            this.plugin, this.viewConfiguration, this, this.fileClass, maxRows, sliceStart)
        this.fileClassDataviewTable.buildTable(this.tableContainer);
        this.fileClassDataviewTable.buildPaginationManager(this.paginationContainer);
    }
}