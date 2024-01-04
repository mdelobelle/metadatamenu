import MetadataMenu from "main"
import { ButtonComponent } from "obsidian"
import { FileClass, FileClassChild } from "../../fileClass"
import { FileClassTableView } from "../fileClassTableView"
import { RowSorterComponent } from "./RowSorterComponent";
import { FieldComponent } from "./FieldComponent";
import { FilterComponent } from "./FilterComponent";
import Field from "src/fields/Field";

export interface ViewConfiguration {
    children: Array<string>,
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
    id: string,
    name: string,
    query: string,
    customFilter: string
}

export interface RowSorter {
    id: string,
    name: string,
    direction: 'asc' | 'desc',
    priority: number
    customOrder?: string[]
}

export interface Column {
    id: string,
    name: string,
    hidden: boolean,
    position: number
}

export interface ColumnMover {
    id: string,
    name: string,
    hidden: boolean,
    leftBtn: ButtonComponent,
    rightBtn: ButtonComponent
    position: number
}


export class FieldSet {
    public fieldComponents: FieldComponent[] = []
    public fileClass: FileClass
    public fileClasses: FileClass[]
    public plugin: MetadataMenu
    public filters: Record<string, FilterComponent> = {}
    public rowSorters: Record<string, RowSorterComponent> = {}
    public columnManagers: Record<string, ColumnMover> = {}
    public fieldsContainer: HTMLDivElement
    public children: FileClassChild[]

    constructor(
        public tableView: FileClassTableView,
        public container: HTMLDivElement
    ) {

        this.plugin = tableView.plugin
        this.build()
    }

    public build(children?: FileClassChild[]) {
        this.fileClass = this.plugin.fieldIndex.fileClassesName.get(this.tableView.fileClass.name)!
        this.children = children || this.fileClass.getViewChildren(this.tableView.manager.selectedView)
        this.fileClasses = [this.fileClass, ...this.children.map(c => c.fileClass)]
        this.container.replaceChildren()
        this.buildFieldComponents()
    }

    public buildFieldComponents() {
        this.fieldComponents = []
        const fileFieldContainer = this.container.createDiv({ cls: "field-container" })
        const fieldComponent = new FieldComponent(this.fileClass, fileFieldContainer, this, "file", "File Name", 0)
        this.fieldComponents.push(fieldComponent);
        let index = 0;
        this.fileClasses.forEach(_fC => {
            const sortedFields = FileClass.getSortedRootFields(this.plugin, _fC)
            for (const [_index, field] of sortedFields.entries()) {
                const fieldContainer = this.container.createDiv({ cls: "field-container" })
                this.fieldComponents.push(new FieldComponent(_fC, fieldContainer, this, field.name, field.name, _index + index + 1))
            }
            index += sortedFields.length
        })
    }

    public reorderFields() {
        this.fieldComponents
            .sort((f1, f2) => f1.columnPosition - f2.columnPosition)
            .forEach(field => this.container.appendChild(field.container))
    }

    public moveColumn(id: string, direction: 'left' | 'right'): void {
        const currentPosition = this.columnManagers[id].position
        Object.keys(this.columnManagers).forEach(_id => {
            const mover = this.columnManagers[_id]
            const field = this.fieldComponents.find(f => f.id === _id)!
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

    public reset(children?: FileClassChild[], updateNeeded: boolean = true) {
        this.rowSorters = {}
        this.filters = {}
        this.columnManagers = {}
        this.build(children)
        if (updateNeeded) this.tableView.update()
        this.tableView.saveViewBtn.setCta()
    }

    public getParams(): ViewConfiguration {
        const children = this.children
        const filters = Object.entries(this.filters).map(([id, filterComponent]) => {
            return {
                id: id,
                name: filterComponent.name,
                query: filterComponent.filter.getValue(),
                customFilter: filterComponent.customFilter
            }
        })
        const sorters = Object.entries(this.rowSorters).filter(([id, s]) => s.direction !== undefined || s.customOrder?.length).map(([id, sorter]) => {
            return {
                id: id,
                name: sorter.name,
                direction: sorter.direction || "asc",
                priority: sorter.priority || 0,
                customOrder: sorter.customOrder || []
            }
        })
        const columns = Object.entries(this.columnManagers).map(([id, columnManager]) => {
            return {
                id: id,
                name: columnManager.name,
                hidden: columnManager.hidden,
                position: columnManager.position
            }
        })
        return {
            children: children.map(c => c.name),
            filters: filters,
            sorters: sorters,
            columns: columns
        }
    }

    public resetColumnManagers() {
        Object.keys(this.columnManagers).forEach(id => {
            const fCFields: Field[] = []
            this.fileClasses.forEach(fC => {
                this.plugin.fieldIndex.fileClassesFields
                    .get(this.fileClass.name)?.filter(_f => _f.isRoot())?.forEach(_f => {
                        fCFields.push(_f)
                    })
            })
            for (const [_index, _field] of fCFields.entries()) {
                const field = this.fieldComponents.find(f => f.name === _field.name && f.fileClass.name === _field.fileClassName)
                if (field && field.id === id) {
                    field.columnPosition = _index + 1
                    field.setVisibilityButtonState(false)
                    this.columnManagers[id].position = _index + 1
                }
            }
            if (id === 'file') {
                const field = this.fieldComponents.find(f => f.name === 'file')
                if (field) {
                    field.columnPosition = 0
                    field.setVisibilityButtonState(false)
                    this.columnManagers[id].position = 0
                }
            }
        })
    }

    public changeView(_name?: string, updateNeeded: boolean = true) {

        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.tableView.manager.selectedView = _name || "";
        this.reset(undefined, updateNeeded)
        if (_name && savedViews.find(view => view.name === _name)) {
            const savedView = savedViews.find(view => view.name === _name)!
            Object.keys(this.filters).forEach(id => {
                const filterComponent = this.filters[id]
                const savedFilter = savedView?.filters.find(f => f.id === id || (!f.id && f.name === filterComponent.name))
                filterComponent.filter.inputEl.value = savedFilter?.query || ""
                filterComponent.customFilter = savedFilter?.customFilter || ""
                filterComponent.toggleCustomFilterState()
            })
            Object.keys(this.rowSorters).forEach(id => {
                const rowSorter: RowSorterComponent = this.rowSorters[id]
                const savedSorter = savedView?.sorters?.find(f => f.id === id || (!f.id && f.name === rowSorter.name))
                if (savedSorter) {
                    rowSorter.priority = savedSorter.priority
                    rowSorter.customOrder = savedSorter.customOrder
                    rowSorter.toggleRowSorterButtonsState(savedSorter.direction)
                    const field = this.fieldComponents.find(f => f.id === id)!
                    field.priorityLabelContainer.textContent = `(${savedSorter.priority})`
                } else {
                    rowSorter.direction = undefined
                    rowSorter.ascBtn.buttonEl.removeClass("active")
                    rowSorter.descBtn.buttonEl.removeClass("active")
                }
            })
            Object.keys(this.columnManagers).forEach(id => {
                const mover = this.columnManagers[id]
                const field = this.fieldComponents.find(f => f.id === id || (!f.id && f.name === mover.name))!
                for (const column of savedView.columns || []) {
                    if (column.id === id) {
                        mover.position = column.position
                        field.columnPosition = column.position
                        field.setVisibilityButtonState(column.hidden)
                    }
                }
            })
        }
        this.reorderFields()
    }
}