import MetadataMenu from "main"
import { ButtonComponent, Modal, TextComponent } from "obsidian"
import { cleanActions } from "src/utils/modals"
import { FileClassTableView } from "./fileClassTableView"
import { RowSorter as ViewRowSorter, ColumnMover } from "./tableViewFieldSet"

interface Filter {
    name: string,
    query: string
}

interface RowSorter {
    name: string,
    direction: 'asc' | 'desc',
    priority: number
}

interface Column {
    name: string,
    hidden: boolean,
    position: number
}

export class SavedView {
    sorters: Array<RowSorter> = []
    filters: Array<Filter> = []
    columns: Array<Column> = []
    constructor(public name: string) {

    }

    public buildFilters(filters: Record<string, TextComponent>) {
        Object.entries(filters).forEach(([name, query]) => {
            this.filters.push({
                name: name,
                query: query.inputEl.value
            })
        })
    }

    public buildRowSorters(rowSorters: Record<string, ViewRowSorter>) {
        Object.keys(rowSorters).forEach(name => {
            const sorter = rowSorters[name]
            if (sorter.direction) {
                this.sorters.push({
                    name: sorter.name,
                    direction: sorter.direction,
                    priority: sorter.priority || 0
                })
            }
        })
    }

    public buildColumnMovers(columnMovers: Record<string, ColumnMover>) {
        Object.entries(columnMovers).forEach(([name, column]) => {
            this.columns.push({
                name: name,
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
        this.savedView.buildColumnMovers(view.fieldSet.columnMovers)
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
        saveBtn.setDisabled(true);
        saveBtn.setIcon("file-plus-2");

        nameErrorContainer.hide();
        nameInput.onChange(async value => {
            this.savedView.name = nameInput.getValue()
            nameErrorContainer.hide();
            saveBtn.setDisabled(false)
            saveBtn.setCta()
            if (this.view.fileClass.options.savedViews?.some(view => view.name === this.savedView.name)) {
                nameErrorContainer.show();
                saveBtn.setDisabled(true)
                saveBtn.removeCta()
            }
            else {
                saveBtn.setDisabled(false);
                saveBtn.setCta();
            }
        });
        saveBtn.onClick(async () => { await this.save() })
    }

    private async save() {
        const options = this.view.fileClass.getFileClassOptions()
        options.savedViews = [...options.savedViews || [], this.savedView]
        await this.view.fileClass.updateOptions(options)
        this.view.selectedView = this.savedView.name
        this.view.favoriteBtn.buttonEl.disabled = false
        this.view.udpate()
        this.close()
    }
}
