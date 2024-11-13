import MetadataMenu from "main";
import { ButtonComponent, debounce, DropdownComponent, setIcon, TextComponent } from "obsidian";
import { FileClass } from "../fileClass";
import { FieldSet } from "./tableViewComponents/tableViewFieldSet";
import { CreateSavedViewModal, SavedView } from "./tableViewComponents/saveViewModal";
import { FileClassDataviewTable } from "./tableViewComponents/fileClassDataviewTable";
import { FileClassViewManager } from "src/components/FileClassViewManager";
import { ChildrenMultiSelectModal } from "./tableViewComponents/ChildrenMultiSelectModal";

export class FileClassTableView {
    public plugin: MetadataMenu;
    public container: HTMLDivElement
    private limit: number
    private tableContainer: HTMLDivElement
    private paginationContainer: HTMLDivElement
    private quickSearchContainer: HTMLDivElement
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
    public refreshBtn: ButtonComponent

    constructor(
        public manager: FileClassViewManager,
        private viewContainer: HTMLDivElement,
        public tableId: string,
        public fileClass: FileClass,
        public selectedView?: string | undefined,
    ) {

        this.plugin = manager.plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-table" })
        this.build()
    };

    public build() {
        this.limit = this.fileClass.getFileClassOptions().limit
        this.container.replaceChildren()
        this.createHeader();
        this.changeView(this.selectedView, false)
    }

    private createHeader(): void {
        const header = this.container.createDiv({ cls: "options" })
        const small_options_container = header.createDiv({ cls: "small_options_container" });
        const limitContainer = small_options_container.createDiv({ cls: "limit" });
        this.paginationContainer = small_options_container.createDiv({ cls: "pagination" });
        const applyContainer = small_options_container.createDiv({ cls: "footer" });
        this.quickSearchContainer = small_options_container.createDiv({ cls: "search" });
        this.fieldsContainer = header.createDiv({ cls: "fields" })
        this.viewSelectContainer = applyContainer.createDiv({ cls: "cell" })

        this.buildLimitManager(limitContainer);
        this.buildFields(this.fieldsContainer)
        this.buildViewSelector()
        this.buildFavoriteViewManager(applyContainer)
        this.buildCleanFields(applyContainer);
        this.buildSaveView(applyContainer);
        this.buildSavedViewRemoveButton(applyContainer)
        if (this.fileClass.getChildren().length) this.buildChildrenSelector(applyContainer);
        this.buildHideInsertFieldBtn(applyContainer);
        this.buildRefreshBtn(applyContainer)
        this.buildHideFilters(applyContainer);
        this.buildQuickSearch(this.quickSearchContainer);
    }

    public update(maxRows?: number, sliceStart: number = 0): void {
        this.manager._children.forEach(child => this.manager.removeChild(child))
        this.fileClassDataviewTable = new FileClassDataviewTable(
            this.fieldSet.getParams(), this, this.fileClass, maxRows, sliceStart)
        for (const observer of this.fileClassDataviewTable.observers) { observer.disconnect() }
        this.buildPaginationManager(this.paginationContainer);
        this.buildViewSelector()
        this.buildTable();
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
        this.fieldSet = new FieldSet(this, container)
    }

    /*
    ** Actions
    */

    /* view selection */

    private changeView(name?: string, updateNeeded: boolean = true) {
        this.fieldSet.changeView(name, updateNeeded)
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
            this.viewSelect.onChange(value => this.changeView(value, false))
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

    private buildQuickSearch(container: HTMLDivElement): void {
        const searchIcon = container.createSpan();
        setIcon(searchIcon, "search");
        const inputField = container.createEl("input")
        inputField.onkeydown = async (e) => {
            if (e.key == "Enter") {
                const file_name_field_component_index = 0;
                const filter_id = this.fieldSet.fieldComponents[file_name_field_component_index].id;
                const searchValue = inputField.value;
                const file_name_filter = this.fieldSet.filters[filter_id];
                file_name_filter.filter.setValue(searchValue);
                file_name_filter.debounced(this.fieldSet);

                if (this.selectedView !== undefined) {
                    const currentViewName = this.selectedView;

                    const savedView = new SavedView("");
                    savedView.children = this.fieldSet.children.map(c => c.name);
                    savedView.buildFilters(this.fieldSet.filters);
                    savedView.buildRowSorters(this.fieldSet.rowSorters);
                    savedView.buildColumnManagers(this.fieldSet.columnManagers);
                    savedView.name = currentViewName;

                    const options = this.fileClass.getFileClassOptions();
                    options.savedViews = [...options.savedViews?.filter(v => v.name !== currentViewName) || [], savedView]

                    await this.fileClass.updateOptions(options);
                    this.selectedView = savedView.name
                    this.favoriteBtn.buttonEl.disabled = false
                    this.update()
                    this.viewSelect.setValue(currentViewName);
                    this.saveViewBtn.removeCta()

                }

            }
        };
    }

    private buildHideInsertFieldBtn(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const hideInsertBtn = new ButtonComponent(btnContainer);
        hideInsertBtn.setIcon("plus-circle");
        hideInsertBtn.setTooltip("Show insert field button in each cell (slower)")
        const toggleState = () => {
            if (this.manager.showAddField) {
                hideInsertBtn.removeCta()
                this.manager.showAddField = false
            } else {
                hideInsertBtn.setCta()
                this.manager.showAddField = true
            }
        }
        hideInsertBtn.onClick(() => { toggleState(); this.update() })
    }

    public triggerRefreshNeeded() {
        this.refreshBtn.buttonEl.show()
        this.refreshBtn.setCta()
    }

    private buildRefreshBtn(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        this.refreshBtn = new ButtonComponent(btnContainer);
        this.refreshBtn.setIcon("refresh-cw");
        this.refreshBtn.setTooltip("Refresh table results")
        this.refreshBtn.buttonEl.hide()
        this.refreshBtn.onClick(() => {
            this.refreshBtn.removeCta();
            this.build();
            //this.update();
            this.refreshBtn.buttonEl.hide()
        })
    }

    /*
    ** Children selector
    */

    private buildChildrenSelector(container: HTMLDivElement) {
        const btnContainer = container.createDiv({ cls: "cell" })
        const childrenBtn = new ButtonComponent(btnContainer);
        childrenBtn.setIcon("network");
        childrenBtn.setTooltip("display children selector")
        childrenBtn.onClick(() => {
            new ChildrenMultiSelectModal(this.plugin, this.fileClass, this.fieldSet).open()
        })
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