import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, Modal, TextComponent } from "obsidian";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "./fileClass";
import { CreateSavedViewModal } from "./tableViewModals";

const oppositeDirection = {
    'asc': 'desc',
    'desc': 'asc'
}

export interface SorterButton {
    btn: ButtonComponent,
    active: boolean,
    direction: 'asc' | 'desc',
    name: string,
    priority?: number
}

export class FileClassTableView {
    private plugin: MetadataMenu;
    public container: HTMLDivElement
    private limit: number
    private tableContainer: HTMLDivElement
    public filters: Record<string, TextComponent> = {}
    public sorters: Record<string, SorterButton> = {}
    private refreshButton: ButtonComponent
    private paginationContainer: HTMLDivElement
    private sliceStart: number = 0
    private firstCollWidth: number;
    private tableFontSize: number;
    private fieldsContainer: HTMLDivElement;
    private sortersPriorityLabels: Record<string, HTMLDivElement> = {}
    private viewSelectContainer: HTMLDivElement;
    public viewSelect: DropdownComponent
    public favoriteBtn: ButtonComponent
    public viewRemoveBtn: ButtonComponent

    constructor(
        plugin: MetadataMenu,
        private component: FileClassManager,
        private viewContainer: HTMLDivElement,
        public fileClass: FileClass,
        public selectedView?: string | undefined
    ) {
        this.plugin = plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-table" })
        this.limit = this.fileClass.getFileClassOptions().limit
        this.createHeader();
        if (this.selectedView) this.changeView(this.selectedView)
    };

    private createHeader(): void {
        const header = this.container.createDiv({ cls: "options" })
        const limitContainer = header.createDiv({ cls: "limit" });
        this.paginationContainer = header.createDiv({ cls: "pagination" });
        this.fieldsContainer = header.createDiv({ cls: "fields" })
        const applyContainer = header.createDiv({ cls: "footer" })
        this.buildLimitManager(limitContainer);
        this.buildPaginationManager(this.paginationContainer)
        this.buildFiltersAndSortManager(this.fieldsContainer);
        this.viewSelectContainer = applyContainer.createDiv({ cls: "cell" })
        this.buildSavedViewSelector()
        this.buildFavoriteViewManager(applyContainer)
        this.buildRefreshManager(applyContainer);
        this.buildCleanFiltersAndSorters(applyContainer);
        this.buildSaveView(applyContainer);
        this.buildSavedViewRemoveButton(applyContainer)
        this.buildHideFilters(applyContainer);
    }

    public udpate(): void {
        this.buildTable();
        this.buildPaginationManager(this.paginationContainer);
        this.buildSavedViewSelector()
        this.refreshButton.removeCta();
    }

    public buildTable(): void {
        if (this.tableContainer) {
            this.tableContainer.remove()
        };
        this.tableContainer = this.container.createDiv({ attr: { id: `table-container-${Math.floor(Date.now() / 1000)}` } })
        this.tableContainer.onscroll = (e) => {
            const table = this.tableContainer
            const firstColl = this.tableContainer.querySelectorAll('tbody > tr > td:first-child')
            const firstFileLink = firstColl[0]?.querySelector("a.internal-link")
            if (firstColl && firstFileLink) {
                if (!this.firstCollWidth) this.firstCollWidth = parseFloat(getComputedStyle(firstColl[0]).width)
                if (!this.tableFontSize) this.tableFontSize = parseFloat(getComputedStyle(firstFileLink).width)
                const position = (e.target as HTMLDivElement).scrollLeft
                if (window.matchMedia("(max-width: 400px)").matches) {
                    if (position !== 0) {
                        table.addClass("scrolled");
                        table.querySelectorAll('tbody > tr > td:first-child').forEach((item: HTMLElement) => {
                            (item.querySelector("a:first-child") as HTMLElement).style.maxWidth = `${Math.max(
                                3 * this.tableFontSize,
                                this.firstCollWidth - this.tableFontSize - position
                            )}px`;
                        })
                    } else {
                        this.tableContainer.removeClass("scrolled")
                        table.querySelectorAll('tbody > tr > td:first-child').forEach((item: HTMLElement) => {
                            (item.querySelector("a:first-child") as HTMLElement).style.maxWidth = "100%";
                        })
                    }

                }
            }
        }

        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            dvApi.executeJs(this.buildDvJSRendering(), this.tableContainer, this.plugin, this.fileClass.getClassFile().path)
        }
        // links aren't clickable anymore, rebinding them to click event
        this.addClickEventToLink()
    }

    private addClickEventToLink(): void {
        this.container.querySelectorAll("a.internal-link")
            .forEach((link: HTMLLinkElement) => {
                link.addEventListener("click", () => this.plugin.app.workspace.openLinkText(
                    //@ts-ignore
                    link.getAttr("data-href").split("/").last()?.replace(/(.*).md/, "$1"),
                    this.fileClass.getClassFile().path,
                    'tab'
                ))
            })
    }

    private buildPaginationManager(container: HTMLDivElement): void {
        container.replaceChildren();

        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            try {
                const values = (new Function("dv", "current", `return ${this.buildDvJSQuery()}`))(dvApi).values;
                const count = values.length;
                for (let i = 0; i <= Math.floor(count / this.limit); i++) {
                    if (i * this.limit < count) {
                        const rangeComponent = container.createDiv({
                            cls: `range ${i === this.sliceStart / this.limit ? "active" : ""}`,
                            text: `${i * this.limit + 1} - ${Math.min((i + 1) * this.limit, count)}`
                        })
                        rangeComponent.onclick = () => {
                            this.sliceStart = i * this.limit;
                            this.udpate();
                        }
                    }
                }
            } catch (e) {
                console.error("unable to build the list of files")
            }

        }
    }

    private buildLimitManager(container: HTMLDivElement): void {
        container.replaceChildren();
        container.createDiv({ text: "Results per page: ", cls: "label" })
        const limitInput = new TextComponent(container)
        limitInput.setValue(`${this.limit}`)
        limitInput.onChange((value) => {
            this.limit = parseInt(value) || this.limit;
            this.refreshButton.setCta();
        })
    }

    private getMaxSorterPriority() {
        return Object.values(this.sorters).reduce((intermediateMax, currentSorter) => Math.max(intermediateMax, currentSorter.priority || 0), 0)
    }

    private changeSorterPriority(name: string, priority: number | undefined) {
        Object.keys(this.sorters).forEach(id => {
            if (new RegExp(`${name}__(asc|desc)`).test(id)) {
                this.sorters[id].priority = priority
                this.sortersPriorityLabels[name].textContent = priority ? `(${priority})` : ""
            }
        })
        //recalculate
        const minPriority = Object.values(this.sorters)
            .map(sorter => sorter.priority)
            .filter(_p => _p !== undefined)
            .sort((a, b) => a! - b!)[0]
            || 0
        Object.keys(this.sorters).forEach(key => {
            const priority = this.sorters[key].priority
            if (priority) {
                const newPriority = priority - minPriority + 1
                this.sorters[key].priority = newPriority
                this.sortersPriorityLabels[this.sorters[key].name].textContent = `(${newPriority})`
            }

        })
    }

    private toggleBtnState(name: string, direction: 'asc' | 'desc'): void {
        const btnId = `${name}__${direction}`;
        const oppositeBtnId = `${name}__${oppositeDirection[direction]}`
        const { btn, active } = this.sorters[btnId]
        const { btn: oppBtn } = this.sorters[oppositeBtnId]
        if (active) {
            btn.buttonEl.removeClass("active");
            this.sorters[btnId].active = false
            this.changeSorterPriority(name, undefined)
        } else {
            btn.setClass("active")
            oppBtn.buttonEl.removeClass("active");
            this.sorters[btnId].active = true;
            this.sorters[oppositeBtnId].active = false;
            if (!this.sorters[btnId].priority) {
                const newPriority = this.getMaxSorterPriority() + 1
                this.changeSorterPriority(name, newPriority)
            }
        }
    }

    private buildSortBtn(name: string, direction: 'asc' | 'desc', component: HTMLDivElement): void {
        const btn = new ButtonComponent(component);
        btn.setIcon(direction === 'asc' ? "chevron-up" : "chevron-down");
        this.sorters[`${name}__${direction}`] = { btn: btn, active: false, name: name, direction: direction }
        btn.onClick(() => {
            this.toggleBtnState(name, direction);
            this.udpate()
        })
    }

    private buildFieldNameAndSortComponent(name: string, label: string, container: HTMLDivElement): void {
        const fieldNameAndSortContainer = container.createDiv({ cls: "field-header" });
        this.buildSortBtn(name, 'asc', fieldNameAndSortContainer);
        this.buildSortBtn(name, 'desc', fieldNameAndSortContainer);
        const prioAndLabelContainer = fieldNameAndSortContainer.createDiv({ cls: "label-container" })
        prioAndLabelContainer.createDiv({ text: label, cls: "field-name" })
        const prioContainer = prioAndLabelContainer.createDiv({ cls: "priority", text: this.sorters[name]?.priority ? `(${this.sorters[name].priority})` : "" })
        this.sortersPriorityLabels[name] = prioContainer
    }

    private buildFilterComponent(name: string, container: HTMLDivElement): void {
        const fieldFilterContainer = container.createDiv({ cls: "filter-input" });
        const filter = new TextComponent(fieldFilterContainer);
        filter.setValue("");
        filter.onChange((value) => {
            this.filters[name].inputEl.value = value;
            this.refreshButton.setCta()
        });
        this.filters[name] = filter
    }

    private buildFiltersAndSortManager(container: HTMLDivElement): void {
        const fieldContainer = container.createDiv({ cls: "field-container" })
        this.buildFieldNameAndSortComponent("file", "File name", fieldContainer)
        this.buildFilterComponent("file", fieldContainer);
        const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name) || [];
        fields.forEach(field => {
            const fieldContainer = container.createDiv({ cls: "field-container" })
            this.buildFieldNameAndSortComponent(field.name, field.name, fieldContainer)
            this.buildFilterComponent(field.name, fieldContainer);
        });
    }

    private changeView(name?: string) {
        const options = this.fileClass.getFileClassOptions()
        const savedViews = options.savedViews || []
        this.resetFilters()
        this.resetSorters()
        if (name && savedViews.find(view => view.name === name)) {
            const savedView = savedViews.find(view => view.name === name)
            Object.keys(this.filters).forEach(name => {
                this.filters[name].inputEl.value = savedView?.filters.find(f => f.name === name)?.query || ""
            })
            Object.keys(this.sorters).forEach(id => {
                const savedSorter = savedView?.sorters.find(f => id === `${f.name}__${f.direction}`)
                const btn = this.sorters[id].btn
                if (savedSorter) {
                    this.sorters[id].active = true
                    this.sorters[id].priority = savedSorter.priority
                    this.sortersPriorityLabels[this.sorters[id].name].textContent = `(${savedSorter.priority})`
                    btn.setClass("active")
                } else {
                    this.sorters[id].active = false
                    btn.buttonEl.removeClass("active")
                }
            })
        } else {
            Object.keys(this.filters).forEach(name => this.filters[name].inputEl.value = "")
            Object.keys(this.sorters).forEach(name => {
                this.sorters[name].btn.buttonEl.removeClass("active")
            })
        }
        this.selectedView = name
        this.toggleFavoriteBtnState()
        this.viewSelect.setValue(name || "")
        this.viewRemoveBtn.setDisabled(!this.selectedView)
        this.viewRemoveBtn.setTooltip(`Remove ${this.selectedView} view from the saved views`)
        this.udpate()
    }

    private buildSavedViewSelector() {
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
                this.udpate()
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
            this.toggleFavoriteBtnState()
        })
    }

    private buildRefreshManager(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        this.refreshButton = new ButtonComponent(btnContainer);
        this.refreshButton.setIcon("refresh-ccw");
        this.refreshButton.setTooltip("Apply the filters and refresh the results")
        this.refreshButton.onClick(() => this.udpate())
    }

    private resetSorters() {
        Object.keys(this.sorters).forEach(key => {
            this.sorters[key].priority = undefined
            this.sorters[key].active = false
            this.sortersPriorityLabels[this.sorters[key].name].textContent = ""
        })
    }

    private resetFilters() {
        Object.keys(this.filters).forEach(name => this.filters[name].inputEl.value = "")
    }

    private buildCleanFiltersAndSorters(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const cleanFilterBtn = new ButtonComponent(btnContainer);
        cleanFilterBtn.setIcon("eraser");
        cleanFilterBtn.setTooltip("remove filter values")
        cleanFilterBtn.onClick(() => {
            const filterInputs = this.container.querySelectorAll(".filter-input input")
            for (const input of filterInputs) {
                if (input instanceof HTMLInputElement) input.value = ""
            }
            this.resetFilters()
            this.resetSorters()
            this.refreshButton.setCta()
        })
    }

    private buildSaveView(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const saveFilterBtn = new ButtonComponent(btnContainer);
        saveFilterBtn.setIcon("save");
        saveFilterBtn.setTooltip("Save current view (filters and sorters)")
        saveFilterBtn.onClick(() => (new CreateSavedViewModal(this.plugin, this)).open())
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

        hideFilterBtn.onClick(() => {
            toggleState();
        })
    }

    private buildFilterQuery(): string {
        return Object.entries(this.filters).map(([fieldName, input]) => {
            const field = fieldName === "file" ? `p.file.name` : `p["${fieldName}"]`
            if (input.getValue()) {
                return `    .filter(p => ${field} && ${field}.toString().toLowerCase().includes("${input.getValue()}".toLowerCase()))\n`
            } else {
                return ""
            }
        }).join("")
    }

    private buildSorterQuery(): string {
        const sorters = Object.entries(this.sorters)
            .sort((s1, s2) => (s1[1].priority || 0) < (s2[1].priority || 0) ? -1 : 1)
            .filter(s => s[1].active)
            .map(s => {
                const fieldKey = s[1].name === "file" ? `["file"]["name"]` : `["${s[1].name}"]`
                const dir = s[1].direction === "asc" ? 1 : -1
                return `        if(p1${fieldKey} > p2${fieldKey}) return ${dir}\n` +
                    `        if(p1${fieldKey} < p2${fieldKey}) return ${-1 * dir}\n`
            })
        const sortingQuery = `    .array().sort((p1, p2) => {\n${sorters.join("")}\n    })\n`
        console.log(this.sorters)
        console.log(sortingQuery)
        return sortingQuery
    }

    private buildDvJSQuery(): string {
        const fFC = this.plugin.fieldIndex.filesFileClasses
        let dvQuery = "";
        const classFilesPath = this.plugin.settings.classFilesPath
        const templatesFolder = this.plugin.app.plugins.plugins["templater-obsidian"]?.settings["templates_folder"];
        const fileClassFiles = [...fFC.keys()].filter(path => fFC.get(path)?.some(fileClass => fileClass.name === this.fileClass.name))
        const fileClassFilesPaths = `"${fileClassFiles.map(fC => fC.replaceAll('"', '\\"')).join('", "')}"`
        dvQuery += `dv.pages()\n`;
        dvQuery += `    .where(p => [${fileClassFilesPaths}].includes(p.file.path)
        ${!!classFilesPath ? "        && !p.file.path.includes('" + classFilesPath + "')\n" : ""}
        ${templatesFolder ? "        && !p.file.path.includes('" + templatesFolder + "')\n" : ""}
        )\n`;
        dvQuery += this.buildFilterQuery();
        return dvQuery;
    }

    private buildDvJSRendering(): string {
        const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.filter(_f => _f.isRoot()) || []
        let dvJS = "const {fieldModifier: f} = this.app.plugins.plugins[\"metadata-menu\"].api;\n" +
            "dv.table([\"File\",";
        dvJS += fields.map(field => `"${field.name}"`).join(",");
        dvJS += `], \n`;
        dvJS += this.buildDvJSQuery();
        dvJS += this.buildSorterQuery();
        dvJS += `    .slice(${this.sliceStart}, ${this.sliceStart + this.limit})\n`;
        dvJS += "    .map(p => [\n        dv.el(\"span\", p.file.link, {cls: \"field-name\"}),\n";
        dvJS += fields.map(field => `        f(dv, p, "${field.name}", {options: {alwaysOn: false, showAddField: true}})`).join(",\n");
        dvJS += "    \n])";
        dvJS += "\n);"
        return dvJS

    }
}