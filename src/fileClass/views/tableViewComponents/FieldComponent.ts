import { ButtonComponent, Debouncer, TextComponent, debounce, setIcon } from "obsidian"
import { FieldSet, btnIcons } from "./tableViewFieldSet"
import { OptionsMultiSelectModal } from "./OptionsMultiSelectModal"
import { RowSorterComponent } from "./RowSorterComponent"

export class FieldComponent {
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
        public customOrder: string[] = []
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
                    this.parentFieldSet.tableView.update()
                    this.parentFieldSet.tableView.saveViewBtn.setCta()
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

    private buildRowSorterComponent(fieldHeader: HTMLDivElement) {

        const rowSorterComponent = new RowSorterComponent(this.parentFieldSet, fieldHeader, this.name,
            this.rowSortingDirection, this.rowPriority, this.customOrder)

        this.parentFieldSet.rowSorters[this.name] = rowSorterComponent
    }

    public setVisibilityButtonState(isHidden: boolean) {
        this.isColumnHidden = isHidden
        this.parentFieldSet.columnManagers[this.name].hidden = this.isColumnHidden
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
        const container = this.container.createDiv({ cls: "field-header" });
        this.buildRowSorterComponent(container)
        const prioAndLabelContainer = container.createDiv({ cls: "label-container" })
        prioAndLabelContainer.createDiv({ text: this.label, cls: "field-name" })
        const priorityLabel = this.parentFieldSet.rowSorters[this.name]?.priority ? `(${this.parentFieldSet.rowSorters[this.name].priority})` : ""
        this.priorityLabelContainer = prioAndLabelContainer.createDiv({ cls: "priority", text: priorityLabel })
        this.buildVisibilityBtn(container)
        this.buildColumnMoverBtn(container)
    }

    private buildFilter(name: string, debounced: Debouncer<[fieldset: FieldSet], void>) {
        const fieldFilterContainer = this.container.createDiv({ cls: "filter-input" });
        const filter = new TextComponent(fieldFilterContainer);
        if (name === "file") {
            filter.setValue("");
            filter.onChange((value) => {
                (this.parentFieldSet.filters[name] as TextComponent).inputEl.value = value;
                debounced(this.parentFieldSet)
            });
        } else {

            const plugin = this.parentFieldSet.plugin
            fieldFilterContainer.addClass("filter-with-dropdown")
            const button = this.container.createEl("button", { cls: "infield-button" })
            filter.inputEl.parentElement?.appendChild(button)
            setIcon(button, "chevron-down")
            filter.setValue("");
            filter.onChange((value) => {
                (this.parentFieldSet.filters[name] as TextComponent).inputEl.value = value;
                debounced(this.parentFieldSet)
            });
            button.onclick = () => {
                const fileClass = this.parentFieldSet.fileClass
                const fileClassFile = fileClass.getClassFile()
                const field = plugin.fieldIndex.fileClassesFields.get(fileClass.name)?.find(f => f.isRoot() && f.name === this.name);
                (new OptionsMultiSelectModal(plugin, fileClassFile, field || "file", this.parentFieldSet)).open()
            }
        }
        this.parentFieldSet.filters[this.name] = filter
    }

    private buildFilterComponent(): void {
        const field = this.parentFieldSet.plugin.fieldIndex.fileClassesFields.get(this.parentFieldSet.fileClass.name)?.find(f => f.name === this.name)
        const debounced = debounce((fieldset: FieldSet) => {
            fieldset.tableView.update();
            this.parentFieldSet.tableView.saveViewBtn.setCta()
        }, 1000, true)
        this.buildFilter(field?.name || "file", debounced)
    }
}