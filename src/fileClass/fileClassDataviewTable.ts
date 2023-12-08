import MetadataMenu from "main";
import { ViewConfiguration } from "./tableViewFieldSet"
import { FileClass } from "./fileClass";
import { fieldStates } from "./OptionsMultiSelectModal";
import { FieldType } from "src/types/fieldTypes";
import { FileClassTableView } from "./fileClassTableView";
import { FileClassCodeBlockView } from "./fileClassCodeBlockView";
import { setIcon } from "obsidian";
import { FileClassViewManager } from "src/components/FileClassViewManager";

export class FileClassDataviewTable {
    private firstCollWidth: number;
    private tableFontSize: number;
    public ranges: HTMLDivElement[] = []
    public limitWrapped: boolean = false
    public limit: number
    private hasButton: boolean = false
    constructor(
        public plugin: MetadataMenu,
        public viewConfiguration: ViewConfiguration,
        public view: FileClassTableView | FileClassCodeBlockView,
        private fileClass: FileClass,
        maxRow?: number,
        private sliceStart: number = 0

    ) {
        this.limit = maxRow || this.fileClass.options.limit || this.plugin.settings.tableViewMaxRecords
    }

    public buildPaginationManager(container: HTMLDivElement): void {
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
                if (rangesCount < 2) return
                for (let i = 0; i < rangesCount; i++) {
                    if (i * this.limit < count) {
                        const rangeComponent = container.createDiv({
                            cls: `range ${i === this.sliceStart / this.limit ? "active" : ""}`,
                            text: `${i * this.limit + 1} - ${Math.min((i + 1) * this.limit, count)}`
                        })
                        rangeComponent.onclick = () => {
                            this.sliceStart = i * this.limit;
                            this.view.update(this.limit, this.sliceStart);
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

    public buildTable(tableContainer: HTMLDivElement): void {
        tableContainer.onscroll = (e) => {
            const table = tableContainer
            const firstColl = tableContainer.querySelectorAll('tbody > tr > td:first-child')
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
                        tableContainer.removeClass("scrolled")
                        table.querySelectorAll('tbody > tr > td:first-child').forEach((item: HTMLElement) => {
                            (item.querySelector("a:first-child") as HTMLElement).style.maxWidth = "100%";
                        })
                    }
                }
            }
        }

        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) dvApi.executeJs(
            this.buildDvJSRendering(),
            tableContainer,
            this.plugin,
            this.fileClass.getClassFile().path
        )
        // links aren't clickable anymore, rebinding them to click event
        if (this.view instanceof FileClassTableView) this.addClickEventToLink(tableContainer)
    }

    public buidFileClassViewBtn(): void {
        const id = this.view.tableId
        if (document.querySelector(`#${id} thead th .fileclass-icon`)) return
        const firstColHeader = document.querySelector(`#${id} thead th`)
        if (firstColHeader) {
            const firstColHeaderContainer = firstColHeader.createDiv({ cls: "first-col-header-container" });
            [...firstColHeader.children].forEach(child => {
                if (!child.hasClass("first-col-header-container")) {
                    firstColHeaderContainer?.append(child)
                }
            })
            const button = firstColHeaderContainer.createDiv({ cls: "fileclass-icon" })
            setIcon(button, this.fileClass.getIcon())
            button.onclick = () => {
                const fileClassViewManager = new FileClassViewManager(this.plugin, this.fileClass, "tableOption", true, this.view.selectedView)
                this.plugin.addChild(fileClassViewManager)
                fileClassViewManager.build()
            }
            firstColHeaderContainer?.prepend(button)
        }
        this.hasButton = true
    }

    private addClickEventToLink(tableContainer: HTMLDivElement): void {
        tableContainer.querySelectorAll("a.internal-link")
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

        return Object.entries(this.viewConfiguration.filters).map(([index, filter]) => {
            const valueGetter = filter.name === "file" ? `p.file.name` : `p["${filter.name}"]`
            if (filter.query) {
                const value = filter.query
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
                        const fCField = filter.name !== "file" ? this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.find(f => f.name === filter.name) : undefined
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
        const sorters = Object.entries(this.viewConfiguration.sorters)
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
        const fields = this.viewConfiguration.columns
            .filter(f => !this.viewConfiguration.columns.find(_f => _f.name === f.name)?.hidden)
            .sort((f1, f2) => f1.position < f2.position ? -1 : 1)
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
                return "        dv.el(\"div\", p.file.link, {cls: \"field-name\"})";
            } else {
                return `        f(dv, p, "${field.name}", {options: {alwaysOn: false, showAddField: true}})`
            }
        }).join(",\n");
        dvJS += "    \n])";
        dvJS += "\n);"
        return dvJS
    }
}