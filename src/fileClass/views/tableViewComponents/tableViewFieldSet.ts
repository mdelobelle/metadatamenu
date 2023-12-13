import MetadataMenu from "main"
import { ButtonComponent, Debouncer, TextComponent, setIcon } from "obsidian"
import { FileClass } from "../../fileClass"
import { FileClassTableView } from "../fileClassTableView"
import { RowSorterComponent } from "./RowSorterComponent";
import { FieldComponent } from "./FieldComponent";
import { OptionsMultiSelectModal } from "./OptionsMultiSelectModal";
import { FilterComponent } from "./FilterComponent";

export interface ViewConfiguration {
    sorters: Array<RowSorter>,
    filters: Array<Filter>,
    columns: Array<Column>
}

export const btnIcons: Record<string, string> = {
    'asc': 'chevron-up',
    'desc': 'chevron-down',
    'left': 'chevron-left',
    'right': 'chevron-right'
}

export interface Filter {
    name: string,
    query: string,
    customFilter: string
}

export interface RowSorter {
    name: string,
    direction: 'asc' | 'desc',
    priority: number
    customOrder?: string[]
}

export interface Column {
    name: string,
    hidden: boolean,
    position: number
}

export interface ColumnMover {
    name: string,
    hidden: boolean,
    leftBtn: ButtonComponent,
    rightBtn: ButtonComponent
    position: number
}


export class FieldSet {
    public fields: FieldComponent[] = []
    public fileClass: FileClass
    public plugin: MetadataMenu
    public filters: Record<string, FilterComponent> = {}
    public rowSorters: Record<string, RowSorterComponent> = {}
    public columnManagers: Record<string, ColumnMover> = {}
    public fieldsContainer: HTMLDivElement

    constructor(
        public tableView: FileClassTableView,
        public container: HTMLDivElement,
    ) {
        this.plugin = tableView.plugin
        this.fileClass = tableView.fileClass
        const fileFieldContainer = container.createDiv({ cls: "field-container" })
        const fileField = new FieldComponent(fileFieldContainer, this, "file", "File Name", 0)
        this.fields.push(fileField)
        const fields = this.plugin.fieldIndex.fileClassesFields
            .get(this.fileClass.name)?.filter(_f => _f.isRoot()) || [];
        for (const [index, field] of fields.entries()) {
            const fieldContainer = container.createDiv({ cls: "field-container" })
            this.fields.push(new FieldComponent(fieldContainer, this, field.name, field.name, index + 1))
        }
    }

    public reorderFields() {
        this.fields
            .sort((f1, f2) => f1.columnPosition - f2.columnPosition)
            .forEach(field => this.container.appendChild(field.container))
    }

    public moveColumn(name: string, direction: 'left' | 'right'): void {
        const currentPosition = this.columnManagers[name].position
        Object.keys(this.columnManagers).forEach(_name => {
            const mover = this.columnManagers[_name]
            const field = this.fields.find(f => f.name === _name)!
            switch (direction) {
                case 'left':
                    if (mover.position === (currentPosition - 1)) {
                        mover.position++;
                        field.columnPosition++
                        break;
                    }
                    if (mover.position === currentPosition) {
                        mover.position--
                        field.columnPosition--
                        break;
                    }
                    break;
                case 'right':
                    if (mover.position === (currentPosition + 1)) {
                        mover.position--
                        field.columnPosition--
                        break;
                    }
                    if (mover.position === currentPosition) {
                        mover.position++
                        field.columnPosition++
                        break;
                    }
                    break;
            }
        })
    }

    private resetRowSorters() {
        Object.keys(this.rowSorters).forEach(_name => {
            this.rowSorters[_name].reset()
            const field = this.fields.find(f => f.name === _name)!
            field.priorityLabelContainer.textContent = ""
        })
    }

    private resetFilters() {
        Object.keys(this.filters).forEach(name => {
            this.filters[name].reset()
        })
    }

    public reset() {
        this.resetRowSorters()
        this.resetFilters()
        this.resetColumnManagers()
        this.tableView.update()
        this.tableView.saveViewBtn.setCta()
    }

    public getParams(): ViewConfiguration {
        const filters = Object.entries(this.filters).map(([name, filterComponent]) => {
            return {
                name: name,
                query: filterComponent.filter.getValue(),
                customFilter: filterComponent.customFilter
            }
        })
        const sorters = Object.entries(this.rowSorters).filter(([n, s]) => s.direction !== undefined || s.customOrder?.length).map(([name, sorter]) => {
            return {
                name: name,
                direction: sorter.direction || "asc",
                priority: sorter.priority || 0,
                customOrder: sorter.customOrder || []
            }
        })
        const columns = Object.entries(this.columnManagers).map(([name, columnManager]) => {
            return {
                name: name,
                hidden: columnManager.hidden,
                position: columnManager.position
            }
        })
        return {
            filters: filters,
            sorters: sorters,
            columns: columns
        }
    }

    public resetColumnManagers() {
        Object.keys(this.columnManagers).forEach(name => {
            const fCFields = this.plugin.fieldIndex.fileClassesFields
                .get(this.fileClass.name)?.filter(_f => _f.isRoot()) || [];
            for (const [_index, _field] of fCFields.entries()) {
                const field = this.fields.find(f => f.name === _field.name)
                if (field && field.name === name) {
                    field.columnPosition = _index + 1
                    this.columnManagers[name].position = _index + 1
                }
            }
            if (name === 'file') {
                const field = this.fields.find(f => f.name === 'file')
                if (field) {
                    field.columnPosition = 0
                    field.setVisibilityButtonState(false)
                    this.columnManagers[name].position = 0
                }
            }
        })
    }

    public changeView(_name?: string) {
        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.reset()
        if (_name && savedViews.find(view => view.name === _name)) {
            const savedView = savedViews.find(view => view.name === _name)!
            Object.keys(this.filters).forEach(name => {
                const filterComponent = this.filters[name]
                const savedFilter = savedView?.filters.find(f => f.name === name)
                filterComponent.filter.inputEl.value = savedFilter?.query || ""
                filterComponent.customFilter = savedFilter?.customFilter || ""
                filterComponent.toggleCustomFilterState()
            })
            Object.keys(this.rowSorters).forEach(name => {
                const rowSorter: RowSorterComponent = this.rowSorters[name]
                const savedSorter = savedView?.sorters?.find(f => f.name === name)
                if (savedSorter) {
                    rowSorter.priority = savedSorter.priority
                    rowSorter.customOrder = savedSorter.customOrder
                    rowSorter.toggleRowSorterButtonsState(savedSorter.direction)
                    const field = this.fields.find(f => f.name === name)!
                    field.priorityLabelContainer.textContent = `(${savedSorter.priority})`
                } else {
                    rowSorter.direction = undefined
                    rowSorter.ascBtn.buttonEl.removeClass("active")
                    rowSorter.descBtn.buttonEl.removeClass("active")
                }
            })
            Object.keys(this.columnManagers).forEach(name => {
                const mover = this.columnManagers[name]
                const field = this.fields.find(f => f.name === name)!
                for (const column of savedView.columns || []) {
                    if (column.name === name) {
                        mover.position = column.position
                        field.columnPosition = column.position
                        field.setVisibilityButtonState(column.hidden)
                    }
                }
            })
            this.reorderFields()
        } else {
            this.resetFilters()
            this.resetRowSorters()
            this.resetColumnManagers()
            this.reorderFields()
        }
    }
}