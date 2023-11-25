import MetadataMenu from "main"
import { ButtonComponent, debounce, DropdownComponent, TextComponent, ToggleComponent } from "obsidian"
import { FieldType } from "src/types/fieldTypes"
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
    public priorityLabelContainer: HTMLDivElement
    public visibilityButton: ButtonComponent

    constructor(
        public container: HTMLDivElement,
        public parentFieldSet: FieldSet,
        public name: string,
        public label: string,
        public columnPosition: number,
        public rowPriority?: number,
        public isColumnHidden: boolean = false,
        public rowSortingDirection: 'asc' | 'desc' | undefined = undefined,
        public query: string = "",
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
        this.parentFieldSet.columnManagers[this.name] = {
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

    public setVisibilityButtonState(isHidden: boolean) {
        this.isColumnHidden = isHidden
        this.parentFieldSet.columnManagers[this.name].hidden = this.isColumnHidden
        this.visibilityButton.setIcon(this.isColumnHidden ? "eye-off" : "eye")
        this.parentFieldSet.tableView.udpate()
    }

    private buildVisibilityBtn(component: HTMLDivElement) {
        this.visibilityButton = new ButtonComponent(component)
            .setIcon(this.isColumnHidden ? "eye-off" : "eye")
            .onClick(() => this.setVisibilityButtonState(!this.isColumnHidden))
    }

    private buildFieldHeaderComponent(): void {
        const container = this.container.createDiv({ cls: "field-header" });
        this.buildRowSorterButtons(container)
        const prioAndLabelContainer = container.createDiv({ cls: "label-container" })
        prioAndLabelContainer.createDiv({ text: this.label, cls: "field-name" })
        const priorityLabel = this.parentFieldSet.rowSorters[this.name]?.priority ? `(${this.parentFieldSet.rowSorters[this.name].priority})` : ""
        this.priorityLabelContainer = prioAndLabelContainer.createDiv({ cls: "priority", text: priorityLabel })
        this.buildVisibilityBtn(container)
        this.buildColumnMoverBtn(container)
    }

    private buildFilterComponent(): void {
        const field = this.parentFieldSet.plugin.fieldIndex.fileClassesFields.get(this.parentFieldSet.fileClass.name)?.find(f => f.name === this.name)
        const debounced = debounce((fieldset: FieldSet) => fieldset.tableView.udpate(), 1000, true)

        switch (field?.type) {
            case FieldType.Boolean:
                {
                    console.log("HERE")
                    const fieldFilterContainer = this.container.createDiv({ cls: "filter-input" });
                    const filter = new DropdownComponent(fieldFilterContainer);

                    filter.addOption("all", "True or false")
                    filter.addOption("true", "True")
                    filter.addOption("false", "False")
                    filter.setValue("all");
                    filter.onChange((value) => {
                        (this.parentFieldSet.filters[this.name] as DropdownComponent).selectEl.value = value;
                        this.parentFieldSet.tableView.udpate()
                    });
                    this.parentFieldSet.filters[this.name] = filter
                }
                break;

            default:
                {
                    const fieldFilterContainer = this.container.createDiv({ cls: "filter-input" });
                    const filter = new TextComponent(fieldFilterContainer);
                    filter.setValue("");
                    filter.onChange((value) => {
                        (this.parentFieldSet.filters[this.name] as TextComponent).inputEl.value = value;
                        debounced(this.parentFieldSet)
                    });
                    this.parentFieldSet.filters[this.name] = filter
                }
                break;
        }

    }
}

export class FieldSet {
    public fields: Field[] = []
    public fileClass: FileClass
    public plugin: MetadataMenu
    public filters: Record<string, TextComponent | DropdownComponent> = {}
    public rowSorters: Record<string, RowSorter> = {}
    public columnManagers: Record<string, ColumnMover> = {}
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
            const field = this.fields.find(f => f.name === _name)!
            const sorter = this.rowSorters[_name]
            if (_name == name) {
                sorter.priority = !currentPriority ? priority : undefined
                field.priorityLabelContainer.textContent = sorter.priority ? `(${sorter.priority})` : ""
            } else if (currentPriority && sorter.priority && !priority && sorter.priority > currentPriority) {
                sorter.priority = sorter.priority - 1
                field.priorityLabelContainer.textContent = `(${sorter.priority})`
            }
        })
    }

    private resetRowSorters() {
        Object.keys(this.rowSorters).forEach(_name => {
            const sorter = this.rowSorters[_name]
            sorter.priority = undefined
            sorter.direction = undefined
            sorter.ascBtn.buttonEl.removeClass("active")
            sorter.descBtn.buttonEl.removeClass("active")
            const field = this.fields.find(f => f.name === _name)!
            field.priorityLabelContainer.textContent = ""
        })
    }

    private resetFilters() {
        Object.keys(this.filters).forEach(name => {
            const filter = this.filters[name]
            if (filter instanceof DropdownComponent) filter.selectEl.value = "all"
            else filter.inputEl.value = ""
        })
    }

    private resetColumnManagers() {

    }

    public reset() {
        this.resetRowSorters()
        this.resetFilters()
        this.resetColumnManagers()
    }

    public changeView(_name?: string) {
        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.reset()
        if (_name && savedViews.find(view => view.name === _name)) {
            const savedView = savedViews.find(view => view.name === _name)!
            Object.keys(this.filters).forEach(name => {
                const filter = this.filters[name]
                if (filter instanceof TextComponent) {
                    filter.inputEl.value = savedView?.filters.find(f => f.name === name)?.query || ""
                } else if (filter instanceof DropdownComponent) {
                    filter.selectEl.value = savedView?.filters.find(f => f.name === name)?.query || "all"
                }
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
            const fCFields = this.plugin.fieldIndex.fileClassesFields
                .get(this.fileClass.name)?.filter(_f => _f.isRoot()) || [];
            Object.keys(this.filters).forEach(name => {
                const filter = this.filters[name]
                if (filter instanceof TextComponent) filter.inputEl.value = ""
                else filter.selectEl.value = "all"
            })
            Object.keys(this.rowSorters).forEach(name => {
                this.rowSorters[name].ascBtn.buttonEl.removeClass("active")
                this.rowSorters[name].descBtn.buttonEl.removeClass("active")
            })
            Object.keys(this.columnManagers).forEach(name => {
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
            this.reorderFields()
        }
    }
}