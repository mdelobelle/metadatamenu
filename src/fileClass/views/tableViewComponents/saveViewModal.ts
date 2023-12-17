import MetadataMenu from "main"
import { ButtonComponent, Modal, TextComponent } from "obsidian"
import { cleanActions } from "src/utils/modals"
import { FileClassTableView } from "../fileClassTableView"
import { ColumnMover, RowSorter, Filter, Column } from "./tableViewFieldSet"
import { RowSorterComponent } from "./RowSorterComponent"
import { FilterComponent } from "./FilterComponent"

export class SavedView {
    sorters: Array<RowSorter> = []
    filters: Array<Filter> = []
    columns: Array<Column> = []
    constructor(public name: string) {

    }

    public buildFilters(filters: Record<string, FilterComponent>) {
        Object.entries(filters).forEach(([id, filterComponent]) => {
            this.filters.push({
                id: id,
                name: filterComponent.name,
                query: filterComponent.filter.inputEl.value,
                customFilter: filterComponent.customFilter
            })
        })
    }

    public buildRowSorters(rowSorters: Record<string, RowSorterComponent>) {
        Object.keys(rowSorters).forEach(id => {
            const sorter = rowSorters[id]
            if (sorter.direction || sorter.customOrder?.length) {
                this.sorters.push({
                    id: id,
                    name: sorter.name,
                    direction: sorter.direction || 'asc',
                    priority: sorter.priority || 0,
                    customOrder: sorter.customOrder || []
                })
            }
        })
    }

    public buildColumnManagers(columnManagers: Record<string, ColumnMover>) {
        Object.entries(columnManagers).forEach(([id, column]) => {
            this.columns.push({
                id: id,
                name: column.name,
                hidden: column.hidden,
                position: column.position
            })
        })
    }
}

export class CreateSavedViewModal extends Modal {
    private savedView: SavedView
    constructor(
        plugin: MetadataMenu,
        private view: FileClassTableView
    ) {
        super(plugin.app)
        this.containerEl.onkeydown = (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                this.save()
            }
            if (e.key === "Escape" && e.altKey) {
                this.close()
            }
        }
        this.savedView = new SavedView("")
        this.savedView.buildFilters(view.fieldSet.filters)
        this.savedView.buildRowSorters(view.fieldSet.rowSorters)
        this.savedView.buildColumnManagers(view.fieldSet.columnManagers)
        this.buildModal()
        this.containerEl.addClass("metadata-menu")
    }

    private buildModal() {
        const nameContainer = this.contentEl.createDiv({ cls: "field-container" });

        nameContainer.createDiv({ text: `Saved view name`, cls: "label" })
        const nameInput = new TextComponent(nameContainer);
        nameInput.inputEl.addClass("with-label");
        nameInput.inputEl.addClass("full-width");
        const nameErrorContainer = this.contentEl.createDiv({ cls: "field-error", text: `This ${this.savedView.name} view name already exists` });

        cleanActions(this.contentEl, ".footer-actions")
        const actionsContainer = this.contentEl.createDiv({ cls: "footer-actions" });
        actionsContainer.createDiv({ cls: "spacer" })
        const infoContainer = actionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const saveBtn = new ButtonComponent(actionsContainer);
        saveBtn.setDisabled(true)
        saveBtn.setIcon("file-plus-2");
        nameErrorContainer.hide();
        nameInput.onChange(async value => {
            this.savedView.name = value
            nameErrorContainer.hide();
            saveBtn.setDisabled(false)
            saveBtn.setCta()
        });
        saveBtn.onClick(async () => { await this.save() })

        if (this.view.selectedView) {
            nameInput.setValue(this.view.selectedView)
            this.savedView.name = this.view.selectedView
            saveBtn.setDisabled(false)
            saveBtn.setCta()
        }
    }

    private async save() {
        const options = this.view.fileClass.getFileClassOptions()
        options.savedViews = [...options.savedViews?.filter(v => v.name !== this.savedView.name) || [], this.savedView]
        await this.view.fileClass.updateOptions(options)
        this.view.selectedView = this.savedView.name
        this.view.favoriteBtn.buttonEl.disabled = false
        this.view.update()
        this.view.saveViewBtn.removeCta()
        this.close()
    }
}
