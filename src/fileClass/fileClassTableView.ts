import MetadataMenu from "main";
import { ButtonComponent, debounce, DropdownComponent, TextComponent } from "obsidian";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "./fileClass";
import { FieldSet } from "./tableViewFieldSet";
import { CreateSavedViewModal } from "./tableViewModal";
import { fieldStates } from "./OptionsMultiSelectModal";
import { FieldType } from "src/types/fieldTypes";

export class FileClassTableView {
    public plugin: MetadataMenu;
    public container: HTMLDivElement
    private limit: number
    private tableContainer: HTMLDivElement
    private paginationContainer: HTMLDivElement
    private sliceStart: number = 0
    private firstCollWidth: number;
    private tableFontSize: number;
    public fieldsContainer: HTMLDivElement;
    private viewSelectContainer: HTMLDivElement;
    public viewSelect: DropdownComponent
    public favoriteBtn: ButtonComponent
    public viewRemoveBtn: ButtonComponent
    public fieldSet: FieldSet
    public limitWrapped: boolean = false
    public ranges: HTMLDivElement[] = []

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
        this.viewSelectContainer = applyContainer.createDiv({ cls: "cell" })
        this.buildLimitManager(limitContainer);
        this.buildPaginationManager(this.paginationContainer)
        this.buildFields(this.fieldsContainer)
        this.buildViewSelector()
        this.buildFavoriteViewManager(applyContainer)
        this.buildCleanFields(applyContainer);
        this.buildSaveView(applyContainer);
        this.buildSavedViewRemoveButton(applyContainer)
        this.buildHideFilters(applyContainer);
    }

    public udpate(): void {
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
        const debounced = debounce((fieldset: FieldSet) => fieldset.tableView.udpate(), 1000, true)
        limitInput.onChange((value) => {
            this.limit = parseInt(value) || this.limit;
            debounced(this.fieldSet)
        })
    }

    /*
    ** Pagination
    */

    private buildPaginationManager(container: HTMLDivElement): void {
        container.replaceChildren();
        this.ranges = []
        const toggleRanges = (rangesCount: number) => {
            for (const [index, rangeComponent] of this.ranges.entries()) {
                if (rangesCount >= 5 && index > 2 && index < rangesCount - 2) {
                    if (this.limitWrapped) rangeComponent.show()
                    else rangeComponent.hide()
                }
            }
            this.limitWrapped = !this.limitWrapped
        }
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            try {
                const values = (new Function("dv", "current", `return ${this.buildDvJSQuery()}`))(dvApi).values;
                const count = values.length;

                const rangesCount = Math.floor(count / this.limit) + 1
                for (let i = 0; i < rangesCount; i++) {
                    if (i * this.limit < count) {
                        const rangeComponent = container.createDiv({
                            cls: `range ${i === this.sliceStart / this.limit ? "active" : ""}`,
                            text: `${i * this.limit + 1} - ${Math.min((i + 1) * this.limit, count)}`
                        })
                        rangeComponent.onclick = () => {
                            this.sliceStart = i * this.limit;
                            this.udpate();
                        }
                        this.ranges.push(rangeComponent)
                    }
                    if (rangesCount >= 5 && i === 2) {
                        const rangeExpander = container.createDiv({
                            cls: `range`,
                            text: `< ... >`
                        })
                        rangeExpander.onclick = () => {
                            if (rangeExpander.hasClass("active")) {
                                rangeExpander.removeClass("active")
                                rangeExpander.setText("< ... >")
                            } else {
                                rangeExpander.addClass("active")
                                rangeExpander.setText("> ... <")
                            }
                            toggleRanges(rangesCount)
                        }
                    }
                }
                const activeRange = this.ranges.find(r => r.hasClass("active"))
                if (activeRange && this.ranges.indexOf(activeRange) < 2) toggleRanges(rangesCount)
            } catch (e) {
                console.error("unable to build the list of files")
            }
        }
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

    private changeView(name?: string) {
        this.fieldSet.changeView(name)
        this.selectedView = name
        this.toggleFavoriteBtnState()
        this.viewSelect.setValue(name || "")
        this.viewRemoveBtn.setDisabled(!this.selectedView)
        this.viewRemoveBtn.setTooltip(`Remove ${this.selectedView} view from the saved views`)
        this.udpate()
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

    private buildCleanFields(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const cleanFilterBtn = new ButtonComponent(btnContainer);
        cleanFilterBtn.setIcon("eraser");
        cleanFilterBtn.setTooltip("remove filter values")
        cleanFilterBtn.onClick(() => this.fieldSet.reset())
    }

    private buildSaveView(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const saveViewBtn = new ButtonComponent(btnContainer);
        saveViewBtn.setIcon("save");
        saveViewBtn.setTooltip("Save current view (filters and sorters)")
        saveViewBtn.onClick(() => (new CreateSavedViewModal(this.plugin, this)).open())
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
                    link.getAttr("data-href")?.replace(/(.*).md/, "$1"),
                    this.fileClass.getClassFile().path,
                    'tab'
                ))
            })
    }

    private buildFilterQuery(): string {
        return Object.entries(this.fieldSet?.filters || {}).map(([fieldName, input]) => {
            const valueGetter = fieldName === "file" ? `p.file.name` : `p["${fieldName}"]`
            if (input.getValue()) {
                const value = input.getValue()
                if (!value.startsWith("/")) {
                    let values = value.split(",").map(item => item.trim())
                    const empty = values.find(v => v === "__empty__")
                    const notEmpty = values.find(v => v === "__notEmpty__")
                    const notFound = values.find(v => v === "__notFound__")
                    const existing = values.find(v => v === "__existing__")
                    values = values.filter(v => !Object.keys(fieldStates).includes(v))
                    if (empty) {
                        return `    .filter(p => ${valueGetter} === null)\n`
                    } else if (notEmpty) {
                        return `    .filter(p => ${valueGetter} !== null)\n`
                    } else if (notFound) {
                        return `    .filter(p => ${valueGetter} === undefined)\n`
                    } else if (existing) {
                        return `    .filter(p => ${valueGetter} !== undefined)\n`
                    } else if (values.length) {
                        const fCField = fieldName !== "file" ? this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.find(f => f.name === fieldName) : undefined
                        if (fCField?.type === FieldType.Boolean) {
                            switch (value) {
                                case 'true':
                                    return `    .filter(p => ${valueGetter} === true)\n`
                                case 'false':
                                    return `    .filter(p => ${valueGetter} === false)\n`
                                case 'false, true':
                                case 'true, false':
                                    return `    .filter(p => [true, false].some(b => ${valueGetter} === b))\n`
                                default:
                                    return ""
                            }
                        } else {
                            const valuesQueries = values.map(val => `${valueGetter}.toString().toLowerCase().includes("${val}".toLowerCase())`)
                            return `    .filter(p => ${valueGetter} && (${valuesQueries.join(" || ")}))\n`
                        }
                    } else {
                        return ""
                    }
                } else {
                    const cleaned = value.replace(/^\//, "").replace(/\/$/, "")
                    let isValid = true
                    try {
                        new RegExp(cleaned)
                    } catch (error) {
                        isValid = false
                    }
                    if (isValid) return `    .filter(p => ${valueGetter} && new RegExp("${cleaned}").test(${valueGetter}))\n`
                    else return ""
                }
            } else {
                return ""
            }
        }).join("")
    }

    private buildSorterQuery(): string {
        const sorters = Object.entries(this.fieldSet.rowSorters)
            .sort((s1, s2) => (s1[1].priority || 0) < (s2[1].priority || 0) ? -1 : 1)
            .filter(s => s[1].direction)
            .map(s => {
                const fieldKey = s[1].name === "file" ? `["file"]["name"]` : `["${s[1].name}"]`
                const dir = s[1].direction === "asc" ? 1 : -1
                return `        if(p1${fieldKey} > p2${fieldKey}) return ${dir}\n` +
                    `        if(p1${fieldKey} < p2${fieldKey}) return ${-1 * dir}\n`
            })
        const sortingQuery = `    .array().sort((p1, p2) => {\n${sorters.join("")}\n    })\n`
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
        //const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.filter(_f => _f.isRoot()) || []
        const fields = this.fieldSet.fields
            .filter(f => !this.fieldSet.fields.find(_f => _f.name === f.name)?.isColumnHidden)
            .sort((f1, f2) => f1.columnPosition < f2.columnPosition ? -1 : 1)
        let dvJS = "const {fieldModifier: f} = MetadataMenu.api;\n" +
            "dv.table([";
        dvJS += fields.map(field => `"${field.name}"`).join(",");
        dvJS += `], \n`;
        dvJS += this.buildDvJSQuery();
        dvJS += this.buildSorterQuery();
        dvJS += `    .slice(${this.sliceStart}, ${this.sliceStart + this.limit})\n`;
        dvJS += "    .map(p => [\n";
        dvJS += fields.map(field => {
            if (field.name === "file") {
                return "        dv.el(\"span\", p.file.link, {cls: \"field-name\"})";
            } else {
                return `        f(dv, p, "${field.name}", {options: {alwaysOn: false, showAddField: true}})`
            }
        }).join(",\n");
        dvJS += "    \n])";
        dvJS += "\n);"
        return dvJS

    }
}