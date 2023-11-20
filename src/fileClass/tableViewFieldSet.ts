import MetadataMenu from "main"
import { ButtonComponent, TextComponent } from "obsidian"
import { FileClass } from "./fileClass"
import { FileClassTableView } from "./fileClassTableView"

const btnIcons: Record<string, string> = {
    'asc': 'chevron-up',
    'desc': 'chevron-down',
    'left': 'chevron-left',
    'right': 'chevron-right'
}

export interface RowSorter {
    name: string,
    direction: 'asc' | 'desc' | undefined,
    ascBtn: ButtonComponent,
    descBtn: ButtonComponent,
    priority?: number
}

export interface ColumnMover {
    name: string,
    hidden: boolean,
    leftBtn: ButtonComponent,
    rightBtn: ButtonComponent
    position: number
}

export class Field {

    constructor(
        public container: HTMLDivElement,
        public parentFieldSet: FieldSet,
        public name: string,
        public label: string,
        public columnPosition: number,
        public rowPriority?: number,
        public isColumnHidden: boolean = false,
        public rowSortingDirection: 'asc' | 'desc' | undefined = undefined,
        public query: string = ""
    ) {
        this.buildFieldHeaderComponent()
        this.buildFilterComponent()
    }

    private canMove(direction: 'left' | 'right'): boolean {
        return !(
            this.columnPosition === 0 &&
            direction === 'left'
            ||
            this.columnPosition === this.parentFieldSet.fields.length - 1 &&
            direction === 'right'
        )
    }

    private buildColumnMoverBtn(component: HTMLDivElement): void {
        const buildBtn = (direction: 'left' | 'right'): ButtonComponent => {
            const btn = new ButtonComponent(component);
            btn.setIcon(btnIcons[direction])
            btn.onClick(() => {
                if (this.canMove(direction)) {
                    this.parentFieldSet.moveColumn(this.name, direction);
                    this.parentFieldSet.reorderFields()
                    this.parentFieldSet.tableView.udpate()
                }
            })
            return btn
        }
        const leftBtn = buildBtn('left')
        const rightBtn = buildBtn('right')
        this.parentFieldSet.columnMovers[this.name] = {
            name: this.name,
            hidden: false,
            leftBtn: leftBtn,
            rightBtn: rightBtn,
            position: this.columnPosition
        }
    }

    private buildRowSorterButtons(component: HTMLDivElement) {
        const buildSorterBtn = (direction: 'asc' | 'desc'): ButtonComponent => {
            const btn = new ButtonComponent(component)
            btn.setIcon(btnIcons[direction])
            btn.onClick(() => {
                this.parentFieldSet.toggleRowSorterButtonsState(this.name, direction);
                this.parentFieldSet.tableView.udpate()
            })
            return btn
        }
        const ascBtn = buildSorterBtn('asc')
        const descBtn = buildSorterBtn('desc')
        this.parentFieldSet.rowSorters[this.name] = {
            name: this.name,
            ascBtn: ascBtn,
            descBtn: descBtn,
            priority: this.rowPriority,
            direction: this.rowSortingDirection
        }
    }

    private buildFieldHeaderComponent(): void {
        const container = this.container.createDiv({ cls: "field-header" });
        this.buildRowSorterButtons(container)
        const prioAndLabelContainer = container.createDiv({ cls: "label-container" })
        prioAndLabelContainer.createDiv({ text: this.label, cls: "field-name" })
        const priorityLabel = this.parentFieldSet.rowSorters[this.name]?.priority ? `(${this.parentFieldSet.rowSorters[this.name].priority})` : ""
        const prioContainer = prioAndLabelContainer.createDiv({ cls: "priority", text: priorityLabel })
        this.parentFieldSet.sortersPriorityLabels[this.name] = prioContainer
        this.buildColumnMoverBtn(container)
    }

    private buildFilterComponent(): void {
        const fieldFilterContainer = this.container.createDiv({ cls: "filter-input" });
        const filter = new TextComponent(fieldFilterContainer);
        filter.setValue("");
        filter.onChange((value) => {
            this.parentFieldSet.filters[this.name].inputEl.value = value;
            this.parentFieldSet.tableView.refreshButton.setCta()
        });
        this.parentFieldSet.filters[this.name] = filter
    }
}

export class FieldSet {
    public fields: Field[] = []
    public fileClass: FileClass
    public plugin: MetadataMenu
    public filters: Record<string, TextComponent> = {}
    public rowSorters: Record<string, RowSorter> = {}
    public columnMovers: Record<string, ColumnMover> = {}
    public sortersPriorityLabels: Record<string, HTMLDivElement> = {}
    public fieldsContainer: HTMLDivElement

    constructor(
        public tableView: FileClassTableView,
        public container: HTMLDivElement,
    ) {
        this.plugin = tableView.plugin
        this.fileClass = tableView.fileClass
        const fileFieldContainer = container.createDiv({ cls: "field-container" })
        const fileField = new Field(fileFieldContainer, this, "file", "File Name", 0)
        this.fields.push(fileField)
        const fields = this.plugin.fieldIndex.fileClassesFields
            .get(this.fileClass.name)?.filter(_f => _f.isRoot()) || [];
        for (const [index, field] of fields.entries()) {
            const fieldContainer = container.createDiv({ cls: "field-container" })
            this.fields.push(new Field(fieldContainer, this, field.name, field.name, index + 1))
        }
    }

    public reorderFields() {
        this.fields
            .sort((f1, f2) => f1.columnPosition - f2.columnPosition)
            .forEach(field => this.container.appendChild(field.container))
    }

    private getMaxRowSorterPriority() {
        return Object.values(this.rowSorters).reduce((intermediateMax, currentSorter) => Math.max(intermediateMax, currentSorter.priority || 0), 0)
    }

    public moveColumn(name: string, direction: 'left' | 'right'): void {
        const currentPosition = this.columnMovers[name].position
        Object.keys(this.columnMovers).forEach(_name => {
            const mover = this.columnMovers[_name]
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

    public toggleRowSorterButtonsState(name: string, direction: 'asc' | 'desc'): void {
        const rowSorter = this.rowSorters[name]
        const { ascBtn, descBtn } = rowSorter
        rowSorter.direction = rowSorter.direction === direction ? undefined : direction
        switch (rowSorter.direction) {
            case undefined:
                ascBtn.buttonEl.removeClass("active")
                descBtn.buttonEl.removeClass("active")
                break;
            case 'asc':
                ascBtn.buttonEl.addClass("active")
                descBtn.buttonEl.removeClass("active")
                break;
            case 'desc':
                ascBtn.buttonEl.removeClass("active")
                descBtn.buttonEl.addClass("active")
                break;
        }
        if (!rowSorter.direction) {
            this.changeRowSorterPriority(name, undefined)
        } else {
            if (!this.rowSorters[name].priority) {
                const newPriority = this.getMaxRowSorterPriority() + 1
                this.changeRowSorterPriority(name, newPriority)
            }
        }
    }

    private changeRowSorterPriority(name: string, priority: number | undefined) {
        const currentPriority = this.rowSorters[name].priority
        Object.keys(this.rowSorters).forEach(_name => {
            const sorter = this.rowSorters[_name]
            if (_name == name) {
                sorter.priority = !currentPriority ? priority : undefined
                this.sortersPriorityLabels[_name].textContent = sorter.priority ? `(${sorter.priority})` : ""
                console.log(_name, sorter.priority, this.sortersPriorityLabels[name].textContent)
            } else if (currentPriority && sorter.priority && !priority && sorter.priority > currentPriority) {
                sorter.priority = sorter.priority - 1
                this.sortersPriorityLabels[_name].textContent = `(${sorter.priority})`
            }
        })
    }

    private resetRowSorters() {
        Object.keys(this.rowSorters).forEach(key => {
            const sorter = this.rowSorters[key]
            sorter.priority = undefined
            sorter.direction = undefined
            sorter.ascBtn.buttonEl.removeClass("active")
            sorter.descBtn.buttonEl.removeClass("active")
            this.sortersPriorityLabels[this.rowSorters[key].name].textContent = ""
        })
    }

    private resetFilters() {
        Object.keys(this.filters).forEach(name => this.filters[name].inputEl.value = "")
    }

    private resetColumnMovers() {

    }

    public reset() {
        this.resetRowSorters()
        this.resetFilters()
        this.resetColumnMovers()
    }

    public changeView(_name?: string) {
        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.reset()
        if (_name && savedViews.find(view => view.name === _name)) {
            const savedView = savedViews.find(view => view.name === _name)!
            Object.keys(this.filters).forEach(name => {
                this.filters[name].inputEl.value = savedView?.filters.find(f => f.name === name)?.query || ""
            })
            Object.keys(this.rowSorters).forEach(name => {
                const rowSorter: RowSorter = this.rowSorters[name]
                const savedSorter = savedView?.sorters?.find(f => f.name === name)
                if (savedSorter) {
                    rowSorter.direction = savedSorter.direction
                    rowSorter.priority = savedSorter.priority
                    switch (rowSorter.direction) {
                        case 'asc':
                            rowSorter.ascBtn.setClass("active")
                            break;
                        case 'desc':
                            rowSorter.descBtn.setClass("active")
                            break;
                    }
                    this.sortersPriorityLabels[name].textContent = `(${savedSorter.priority})`
                } else {
                    rowSorter.direction = undefined
                    rowSorter.ascBtn.buttonEl.removeClass("active")
                    rowSorter.descBtn.buttonEl.removeClass("active")
                }
            })
            Object.keys(this.columnMovers).forEach(name => {
                const mover = this.columnMovers[name]
                const field = this.fields.find(f => f.name === name)!
                for (const column of savedView.columns || []) {
                    if (column.name === name) {
                        mover.position = column.position
                        field.columnPosition = column.position
                    }
                }
            })
            this.reorderFields()
        } else {
            const fCFields = this.plugin.fieldIndex.fileClassesFields
                .get(this.fileClass.name)?.filter(_f => _f.isRoot()) || [];
            Object.keys(this.filters).forEach(name => this.filters[name].inputEl.value = "")
            Object.keys(this.rowSorters).forEach(name => {
                this.rowSorters[name].ascBtn.buttonEl.removeClass("active")
                this.rowSorters[name].descBtn.buttonEl.removeClass("active")
            })
            Object.keys(this.columnMovers).forEach(name => {
                for (const [_index, _field] of fCFields.entries()) {
                    const field = this.fields.find(f => f.name === _field.name)
                    if (field && field.name === name) {
                        field.columnPosition = _index + 1
                        this.columnMovers[name].position = _index + 1
                    }
                }
                if (name === 'file') {
                    const field = this.fields.find(f => f.name === 'file')
                    if (field) {
                        field.columnPosition = 0
                        this.columnMovers[name].position = 0
                    }
                }
            })
            this.reorderFields()
        }
    }
}