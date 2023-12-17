import MetadataMenu from "main";
import { ButtonComponent, debounce, DropdownComponent, TextComponent } from "obsidian";
import { FileClass } from "../fileClass";
import { FieldSet } from "./tableViewComponents/tableViewFieldSet";
import { CreateSavedViewModal } from "./tableViewComponents/saveViewModal";
import { FileClassDataviewTable } from "./tableViewComponents/fileClassDataviewTable";
import { FileClassViewManager } from "src/components/FileClassViewManager";

export class FileClassTableView {
    public plugin: MetadataMenu;
    public container: HTMLDivElement
    private limit: number
    private tableContainer: HTMLDivElement
    private paginationContainer: HTMLDivElement
    public fieldsContainer: HTMLDivElement;
    private viewSelectContainer: HTMLDivElement;
    public saveViewBtn: ButtonComponent;
    public viewSelect: DropdownComponent
    public favoriteBtn: ButtonComponent
    public viewRemoveBtn: ButtonComponent
    public fieldSet: FieldSet
    public limitWrapped: boolean = false
    public ranges: HTMLDivElement[] = []
    public fileClassDataviewTable: FileClassDataviewTable

    constructor(
        public manager: FileClassViewManager,
        private viewContainer: HTMLDivElement,
        public tableId: string,
        public fileClass: FileClass,
        public selectedView?: string | undefined
    ) {
        this.plugin = manager.plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-table" })
        this.limit = this.fileClass.getFileClassOptions().limit
        this.createHeader();
        this.fileClassDataviewTable = new FileClassDataviewTable(
            this.fieldSet.getParams(), this, this.fileClass)
        if (this.selectedView) this.changeView(this.selectedView)
    };

    private createHeader(): void {
        const header = this.container.createDiv({ cls: "options" })
        const limitContainer = header.createDiv({ cls: "limit" });
        this.paginationContainer = header.createDiv({ cls: "pagination" });
        this.fieldsContainer = header.createDiv({ cls: "fields" })
        const applyContainer = header.createDiv({ cls: "footer" })
        this.viewSelectContainer = applyContainer.createDiv({ cls: "cell" })

        this.buildLimitManager(limitContainer);
        this.buildFields(this.fieldsContainer)
        this.buildViewSelector()
        this.buildFavoriteViewManager(applyContainer)
        this.buildCleanFields(applyContainer);
        this.buildSaveView(applyContainer);
        this.buildSavedViewRemoveButton(applyContainer)
        this.buildHideFilters(applyContainer);
    }

    public update(maxRows?: number, sliceStart: number = 0): void {
        this.fileClassDataviewTable = new FileClassDataviewTable(
            this.fieldSet.getParams(), this, this.fileClass, maxRows, sliceStart)
        this.buildTable();
        this.buildPaginationManager(this.paginationContainer);
        this.buildViewSelector()
    }

    /*
    ** Max rows
    */

    private buildLimitManager(container: HTMLDivElement): void {
        container.replaceChildren();
        container.createDiv({ text: "Results per page: ", cls: "label" })
        const limitInput = new TextComponent(container)
        limitInput.setValue(`${this.limit}`)
        const debounced = debounce((fieldset: FieldSet) => fieldset.tableView.update(this.limit), 1000, true)
        limitInput.onChange((value) => {
            this.limit = parseInt(value) || this.limit;
            this.saveViewBtn.setCta()
            debounced(this.fieldSet)
        })
    }

    /*
    ** Pagination
    */

    private buildPaginationManager(container: HTMLDivElement): void {
        this.fileClassDataviewTable.buildPaginationManager(container)
    }

    /*
    ** Fields
    */

    private buildFields(container: HTMLDivElement) {
        container.replaceChildren()
        this.fieldSet = new FieldSet(this, container, this.fileClass.getChildren())
    }

    /*
    ** Actions
    */

    /* view selection */

    private changeView(name?: string) {
        this.fieldSet.changeView(name)
        this.selectedView = name
        this.toggleFavoriteBtnState()
        this.viewSelect.setValue(name || "")
        this.viewRemoveBtn.setDisabled(!this.selectedView)
        this.viewRemoveBtn.setTooltip(`Remove ${this.selectedView} view from the saved views`)
        this.update()
        this.saveViewBtn.removeCta()
    }

    private buildViewSelector() {
        this.viewSelectContainer.replaceChildren()
        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.viewSelect = new DropdownComponent(this.viewSelectContainer)
        if (!savedViews.length) {
            this.viewSelect.addOption("", "No saved view")
            this.viewSelect.setDisabled(true)
        } else {
            this.viewSelect.addOption("", "--None--")
            savedViews.sort((a, b) => a.name < b.name ? -1 : 1).forEach(view => this.viewSelect.addOption(view.name, view.name))
            this.viewSelect.onChange(value => this.changeView(value))
            this.viewSelect.setValue(this.selectedView || "")
        }
    }

    private buildSavedViewRemoveButton(container: HTMLDivElement) {
        const btnContainer = container.createDiv({ cls: "cell" })
        this.viewRemoveBtn = new ButtonComponent(btnContainer)
            .setIcon("trash")
            .setClass("remove-button")
            .setDisabled(!this.selectedView)
            .setTooltip(`Remove ${this.selectedView} view from the saved views`)
            .onClick(async () => {
                const options = this.fileClass.getFileClassOptions()
                if (options.favoriteView === this.selectedView) options.favoriteView = null
                options.savedViews = options.savedViews?.filter(view => view.name !== this.selectedView)
                await this.fileClass.updateOptions(options)
                this.changeView()
                this.viewRemoveBtn.setDisabled(true)
                this.update()
            })
    }

    private toggleFavoriteBtnState() {
        const options = this.fileClass.getFileClassOptions()
        const favoriteView = options.favoriteView || null
        if (options.savedViews?.length) {
            this.favoriteBtn.setDisabled(false)
            if (this.selectedView === favoriteView && !!favoriteView) {
                this.favoriteBtn.setTooltip("Unselect this view as your favorite view")
                this.favoriteBtn.buttonEl.addClass("favorite")
            } else if (this.selectedView !== undefined) {
                this.favoriteBtn.setTooltip("Select this view as your favorite view")
                this.favoriteBtn.buttonEl.removeClass("favorite")
            } else {
                this.favoriteBtn.setDisabled(true)
                this.favoriteBtn.buttonEl.removeClass("favorite")
            }
        } else {
            this.favoriteBtn.setDisabled(true)
            this.favoriteBtn.setTooltip("You don't have any saved view yet")
        }
    }

    private buildFavoriteViewManager(container: HTMLDivElement) {

        const btnContainer = container.createDiv({ cls: "cell" })
        this.favoriteBtn = new ButtonComponent(btnContainer);
        this.favoriteBtn.setClass("favorite-button")
        this.favoriteBtn.setIcon("star");
        this.toggleFavoriteBtnState()
        this.favoriteBtn.onClick(async () => {
            const options = this.fileClass.getFileClassOptions()
            const favoriteView = options.favoriteView || null
            if (this.selectedView === favoriteView) {
                options.favoriteView = null
                this.favoriteBtn.buttonEl.removeClass("favorite")
            } else if (this.selectedView !== undefined) {
                options.favoriteView = this.selectedView
                this.favoriteBtn.buttonEl.addClass("favorite")
            }
            await this.fileClass.updateOptions(options)
            this.saveViewBtn.setCta()
            this.toggleFavoriteBtnState()
        })
    }

    private buildCleanFields(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const cleanFilterBtn = new ButtonComponent(btnContainer);
        cleanFilterBtn.setIcon("eraser");
        cleanFilterBtn.setTooltip("Clear all filters, sorters and ordering")
        cleanFilterBtn.onClick(() => this.fieldSet.reset())
    }

    private buildSaveView(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        this.saveViewBtn = new ButtonComponent(btnContainer)
            .setIcon("save")
            .setTooltip("Save current view (filters and sorters)")
            .onClick(() => (new CreateSavedViewModal(this.plugin, this)).open())
    }

    private buildHideFilters(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const hideFilterBtn = new ButtonComponent(btnContainer);
        this.fieldsContainer.style.display = "none"
        hideFilterBtn.setIcon("list-end");
        hideFilterBtn.setTooltip("display filters")
        const toggleState = () => {
            if (this.fieldsContainer.getCssPropertyValue('display') !== "none") {
                this.fieldsContainer.style.display = "none"
                hideFilterBtn.setIcon("list-end");
                hideFilterBtn.setTooltip("display filters")
            } else {
                this.fieldsContainer.style.display = "flex";
                hideFilterBtn.setIcon("list-start");
                hideFilterBtn.setTooltip("collapse filters");
            }
        }
        hideFilterBtn.onClick(() => toggleState())
    }

    /*
    ** Table
    */

    public buildTable(): void {
        if (this.tableContainer) {
            this.tableContainer.remove()
        };
        this.tableContainer = this.container.createDiv({ attr: { id: this.tableId } })
        this.fileClassDataviewTable.buildTable(this.tableContainer)
    }
}