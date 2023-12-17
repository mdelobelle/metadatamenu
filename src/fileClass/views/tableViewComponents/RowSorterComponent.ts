import { ButtonComponent } from "obsidian"
import { FieldSet, btnIcons } from "./tableViewFieldSet"
import { OptionsPriorityModal } from "./OptionsPriorityModal"
import { FileClass } from "src/fileClass/fileClass"

export class RowSorterComponent {
    public id: string
    public ascBtn: ButtonComponent
    public descBtn: ButtonComponent
    public customOrderBtn: ButtonComponent

    constructor(
        public parentFieldset: FieldSet,
        public fileClass: FileClass,
        public fieldContainer: HTMLDivElement,
        public name: string,
        public direction: 'asc' | 'desc' | undefined,
        public priority?: number,
        public customOrder?: string[],
    ) {
        this.id = `${this.fileClass}____${this.name}`
        this.ascBtn = this.buildSorterBtn('asc')
        this.descBtn = this.buildSorterBtn('desc')
        this.customOrderBtn = new ButtonComponent(fieldContainer)
        this.customOrderBtn.setIcon("list-ordered")
        this.customOrderBtn.onClick(() => {
            const plugin = this.parentFieldset.plugin
            const fileClass = this.parentFieldset.fileClass
            const fileClassFile = fileClass.getClassFile()
            const field = plugin.fieldIndex.fileClassesFields.get(fileClass.name)?.find(f => f.isRoot() && f.name === this.name);
            (new OptionsPriorityModal(plugin, fileClassFile, field || "file", this.parentFieldset, this)).open()
        })
    }


    private buildSorterBtn = (direction: 'asc' | 'desc'): ButtonComponent => {
        const btn = new ButtonComponent(this.fieldContainer)
        btn.setIcon(btnIcons[direction])
        btn.onClick(() => {
            this.toggleRowSorterButtonsState(direction);
            this.parentFieldset.tableView.update()
            this.parentFieldset.tableView.saveViewBtn.setCta()
        })
        return btn
    }

    public toggleRowSorterButtonsState(direction: 'asc' | 'desc' | undefined): void {
        this.direction = this.direction === direction ? undefined : direction
        switch (this.direction) {
            case undefined:
                this.ascBtn.buttonEl.removeClass("active")
                this.descBtn.buttonEl.removeClass("active")
                break;
            case 'asc':
                this.ascBtn.buttonEl.addClass("active")
                this.descBtn.buttonEl.removeClass("active")
                break;
            case 'desc':
                this.ascBtn.buttonEl.removeClass("active")
                this.descBtn.buttonEl.addClass("active")
                break;
        }
        if (!this.direction) {
            this.changeRowSorterPriority(undefined)
        } else {
            if (!this.priority) {
                const newPriority = this.getMaxRowSorterPriority() + 1
                this.changeRowSorterPriority(newPriority)
            }
        }
        if (!(this.customOrder?.length)) {
            this.customOrderBtn.buttonEl.removeClass("active")
        } else {
            this.customOrderBtn.buttonEl.addClass("active")
        }
    }

    private changeRowSorterPriority(priority: number | undefined) {
        const currentPriority = this.priority
        Object.keys(this.parentFieldset.rowSorters).forEach(_id => {
            const field = this.parentFieldset.fieldComponents.find(f => f.id === _id)!
            const sorter = this.parentFieldset.rowSorters[_id]
            if (_id == this.id) {
                sorter.priority = !currentPriority ? priority : undefined
                field.priorityLabelContainer.textContent = sorter.priority ? `(${sorter.priority})` : ""
            } else if (currentPriority && sorter.priority && !priority && sorter.priority > currentPriority) {
                sorter.priority = sorter.priority - 1
                field.priorityLabelContainer.textContent = `(${sorter.priority})`
            }
        })
    }

    private getMaxRowSorterPriority() {
        return Object.values(this.parentFieldset.rowSorters)
            .reduce((intermediateMax, currentSorter) => Math.max(intermediateMax, currentSorter.priority || 0), 0)
    }

    public reset() {
        this.priority = undefined
        this.direction = undefined
        this.ascBtn.buttonEl.removeClass("active")
        this.descBtn.buttonEl.removeClass("active")
    }
}