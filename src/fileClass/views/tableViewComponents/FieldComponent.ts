import { ButtonComponent, Debouncer, TextComponent, debounce, setIcon } from "obsidian"
import { FieldSet, btnIcons } from "./tableViewFieldSet"
import { RowSorterComponent } from "./RowSorterComponent"
import { FilterComponent } from "./FilterComponent"
import { FileClass } from "src/fileClass/fileClass"

export class FieldComponent {
    public priorityLabelContainer: HTMLDivElement
    public visibilityButton: ButtonComponent
    public id: string

    constructor(
        public fileClass: FileClass,
        public container: HTMLDivElement,
        public parentFieldSet: FieldSet,
        public name: string,
        public label: string,
        public columnPosition: number,
        public rowPriority?: number,
        public isColumnHidden: boolean = false,
        public rowSortingDirection: 'asc' | 'desc' | undefined = undefined,
        public query: string = "",
        public customOrder: string[] = []
    ) {
        this.id = `${this.fileClass.name}____${this.name}`
        this.buildFieldHeaderComponent()
        this.buildFieldComponent()
    }

    private canMove(direction: 'left' | 'right'): boolean {
        return !(
            this.columnPosition === 0 &&
            direction === 'left'
            ||
            this.columnPosition === this.parentFieldSet.fieldComponents.length - 1 &&
            direction === 'right'
        )
    }

    private buildColumnMoverBtn(component: HTMLDivElement): void {
        const buildBtn = (direction: 'left' | 'right'): ButtonComponent => {
            const btn = new ButtonComponent(component);
            btn.setIcon(btnIcons[direction])
            btn.onClick(() => {
                if (this.canMove(direction)) {
                    this.parentFieldSet.moveColumn(this.id, direction);
                    this.parentFieldSet.reorderFields()
                    this.parentFieldSet.tableView.update()
                    this.parentFieldSet.tableView.saveViewBtn.setCta()
                }
            })
            return btn
        }
        const leftBtn = buildBtn('left')
        const rightBtn = buildBtn('right')
        this.parentFieldSet.columnManagers[this.id] = {
            id: this.id,
            name: this.name,
            hidden: false,
            leftBtn: leftBtn,
            rightBtn: rightBtn,
            position: this.columnPosition
        }
    }

    private buildRowSorterComponent(fileClass: FileClass, fieldHeader: HTMLDivElement) {

        const rowSorterComponent = new RowSorterComponent(this.parentFieldSet, fileClass, fieldHeader, this.name,
            this.rowSortingDirection, this.rowPriority, this.customOrder)
        this.parentFieldSet.rowSorters[this.id] = rowSorterComponent
    }

    public setVisibilityButtonState(isHidden: boolean) {
        this.isColumnHidden = isHidden
        this.parentFieldSet.columnManagers[this.id].hidden = this.isColumnHidden
        this.visibilityButton.setIcon(this.isColumnHidden ? "eye-off" : "eye")
    }

    private buildVisibilityBtn(component: HTMLDivElement) {
        this.visibilityButton = new ButtonComponent(component)
            .setIcon(this.isColumnHidden ? "eye-off" : "eye")
            .onClick(() => {
                this.setVisibilityButtonState(!this.isColumnHidden)
                this.parentFieldSet.tableView.update()
                this.parentFieldSet.tableView.saveViewBtn.setCta()
            })
    }

    private buildFieldHeaderComponent(): void {
        if (this.parentFieldSet.children.length) {
            this.container.createDiv({
                text: this.fileClass.name,
                cls: "field-fileclass-header"
            });
        }
        const container = this.container.createDiv({ cls: "field-header" });
        this.buildRowSorterComponent(this.fileClass, container)
        const prioAndLabelContainer = container.createDiv({ cls: "label-container" })
        prioAndLabelContainer.createDiv({ text: this.label, cls: "field-name" })
        const priorityLabel = this.parentFieldSet.rowSorters[this.id]?.priority ? `(${this.parentFieldSet.rowSorters[this.id].priority})` : ""
        this.priorityLabelContainer = prioAndLabelContainer.createDiv({ cls: "priority", text: priorityLabel })
        this.buildVisibilityBtn(container)
        this.buildColumnMoverBtn(container)
    }

    private buildFilter(name: string, debounced: Debouncer<[fieldset: FieldSet], void>) {
        const fieldFilterContainer = this.container.createDiv({ cls: "filter-input" });
        const filterComponent = new FilterComponent(this.fileClass, fieldFilterContainer, name, this.parentFieldSet, debounced)
        this.parentFieldSet.filters[filterComponent.id] = filterComponent
    }

    private buildFieldComponent(): void {
        const field = this.parentFieldSet.plugin.fieldIndex.fileClassesFields.get(this.parentFieldSet.fileClass.name)?.find(f => f.name === this.name)
        const debounced = debounce((fieldset: FieldSet) => {
            fieldset.tableView.update();
            this.parentFieldSet.tableView.saveViewBtn.setCta()
        }, 1000, true)
        this.buildFilter(field?.name || "file", debounced)
    }
}