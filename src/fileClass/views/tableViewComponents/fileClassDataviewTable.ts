import MetadataMenu from "main";
import { Column, ViewConfiguration } from "./tableViewFieldSet"
import { FileClass } from "../../fileClass";
import { fieldStates } from "./OptionsMultiSelectModal";
import { FileClassTableView } from "../fileClassTableView";
import { FileClassCodeBlockView } from "../fileClassCodeBlockView";
import { MarkdownPostProcessorContext, TFile, setIcon } from "obsidian";
import { FileClassViewManager } from "src/components/FileClassViewManager";
import { fieldValueManager } from "src/fields/Field";
import { extensionMediaTypes } from "src/types/mediaTypes";

export class FileClassDataviewTable {
    private firstCollWidth: number;
    private tableFontSize: number;
    public ranges: HTMLDivElement[] = []
    public limitWrapped: boolean = false
    public limit: number
    public plugin: MetadataMenu
    public count: number;
    public columnsFileClassField: Record<string, { fileClassName: string, fieldName: string }> = {}
    public observers: MutationObserver[] = []

    constructor(
        public viewConfiguration: ViewConfiguration,
        public view: FileClassTableView | FileClassCodeBlockView,
        private fileClass: FileClass,
        maxRow?: number,
        private sliceStart: number = 0,
        private ctx?: MarkdownPostProcessorContext
    ) {
        this.plugin = this.view.manager.plugin
        this.limit = maxRow || this.fileClass.options.limit || this.plugin.settings.tableViewMaxRecords
    }

    public getFilteredFiles(): any {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            try {
                const current = this.ctx ? dvApi.page(this.ctx.sourcePath) : {}
                const fFC = this.plugin.fieldIndex.filesFileClasses
                const fileClassesNames = [this.fileClass.name, ...this.viewConfiguration.children]
                const fileClassFiles = [...fFC.keys()].filter(path => fFC.get(path)?.some(_fileClass => fileClassesNames.includes(_fileClass.name)))
                const fileFileClasses = (path: string) => {
                    return this.plugin.fieldIndex.filesFileClasses.get(path)?.map(_fC => _fC.name) || []
                }
                const hasFileClass = (path: string, id: string) => {
                    if (id.includes('____')) {
                        const fileClassName = id.split('____')[0]
                        return fileFileClasses(path).includes(fileClassName)
                    } else {
                        return true
                    }
                }
                const query = (new Function(
                    "dv", "current", "fileClassFiles", "hasFileClass",
                    `return ${this.buildDvJSQuery()}`)
                )(dvApi, current, fileClassFiles, hasFileClass)
                const values = query.values;
                return values
            } catch (e) {
                console.log(e)
                console.error("unable to build the list of files")
            }
        } else {
            return []
        }
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

        const values: any[] = this.getFilteredFiles() || [];
        this.count = values.length;
        const rangesCount = Math.floor(this.count / this.limit) + 1
        if (rangesCount < 2) return
        for (let i = 0; i < rangesCount; i++) {
            if (i * this.limit < this.count) {
                const rangeComponent = container.createDiv({
                    cls: `range ${i === this.sliceStart / this.limit ? "active" : ""}`,
                    text: `${i * this.limit + 1} - ${Math.min((i + 1) * this.limit, this.count)}`
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

    }

    public addLinkClickEvent(observed: HTMLDivElement) {
        var callback = function (mutationsList: MutationRecord[], table: FileClassDataviewTable) {
            for (var mutation of mutationsList) {
                if (mutation.type == "childList") {
                    for (const node of mutation.addedNodes) {
                        if (
                            "className" in node &&
                            typeof (node as HTMLElement).className === "string" &&
                            ((node as HTMLElement).className as string).includes('field-name')
                        ) {
                            const fileLink = (node as HTMLElement).querySelector("span a.internal-link");
                            if (fileLink) table.addClickEventToLink(fileLink as HTMLLinkElement)
                        }
                    }
                }
            }
        };
        const observer = new MutationObserver(mutationList => callback(mutationList, this));
        if (observed) observer.observe(observed, { childList: true });
    }

    public buildBulkModifiers(observed: HTMLDivElement) {

        const cleanTable = (table: HTMLTableElement) => {
            for (const selector of table.querySelectorAll(".modifier-selector")) {
                (selector as HTMLElement).parentElement?.removeChild(selector)
            }
            for (const toggler of table.querySelectorAll(".checkbox-toggler")) {
                (toggler as HTMLElement).parentElement?.removeChild(toggler)
            }
        }

        const processFilesFieldChange = (dvTable: FileClassDataviewTable, selectedFiles: string[], allFilesSelected: boolean, columndId: string) => {
            const { fileClassName, fieldName } = dvTable.columnsFileClassField[columndId]
            const field = this.plugin.fieldIndex.fileClassesFields.get(fileClassName)?.find(f => f.isRoot() && f.name === fieldName)
            const files = selectedFiles.map(sF => this.plugin.app.vault.getAbstractFileByPath(sF)).filter(f => f instanceof TFile) as TFile[]

            if (field) {
                const fieldVM = fieldValueManager(this.plugin, field.id, field.fileClassName, files, undefined)
                fieldVM?.openModal()
            }
        }

        const buildCellCheckBox = (
            table: HTMLTableElement,
            cell: HTMLTableCellElement,
            filesCheckboxes: HTMLInputElement[],
            allFilesSelected: boolean,
            selectedFiles: string[]
        ) => {
            const checkBoxContainer = cell.createDiv({ cls: "modifier-selector" })
            const checkBox = checkBoxContainer.createEl("input", { type: "checkbox" })

            if (cell.tagName === "TH") checkBox.addClass("page-checkbox")
            else filesCheckboxes.push(checkBox)
            checkBox.onclick = (e) => {
                e.stopPropagation();
                checkBox.toggleAttribute("checked")
                if (cell!.tagName === "TH") {
                    allFilesSelected = checkBox.checked
                    for (const cB of filesCheckboxes) cB.checked = false
                    selectedFiles.splice(0)
                    if (allFilesSelected) {
                        for (const cell of table.querySelectorAll("div.field-name a.internal-link")) {
                            const name = cell?.getAttr("data-href");
                            if (name) selectedFiles.push(name)
                        }
                        for (const cB of filesCheckboxes) cB.checked = true
                    }

                } else {
                    const headerCheckbox = table.querySelector(".page-checkbox")
                    if (headerCheckbox) {
                        (headerCheckbox as HTMLInputElement).checked = false
                        allFilesSelected = false
                    }
                    const name = cell!.querySelector("div.field-name a.internal-link")?.getAttr("data-href")
                    if (checkBox.checked && name) selectedFiles.push(name)
                    else if (name) selectedFiles.remove(name)
                }
            }
            checkBoxContainer.hide()
            cell.prepend(checkBoxContainer)
        }

        const buildHeaderCols = (
            dvTable: FileClassDataviewTable,
            table: HTMLTableElement,
            selectedFiles: string[],
            allFilesSelected: boolean
        ) => {
            const header = table.rows[0]
            for (const [index, column] of Object.entries(header.cells)) {

                if (index === "0") {
                    column.createDiv({ cls: "spacer" })
                    const toggleButtonContainer = column.createDiv({ cls: "checkbox-toggler" })
                    setIcon(toggleButtonContainer, "list-todo")

                }

                column.onclick = (e) => {
                    if (index === "0") {
                        const cells = table.querySelectorAll('.modifier-selector') as NodeListOf<HTMLTableCellElement>
                        for (const cell of cells) {
                            const input = cell.find("input")
                            if (input && !(input as HTMLElement & { checkVisibility: () => boolean }).checkVisibility()) cell.show()
                            else cell.hide()
                        }
                    } else {
                        const columnId = (column.querySelector('span.column-id') as HTMLInputElement).id
                        if (selectedFiles.length || allFilesSelected) processFilesFieldChange(dvTable, selectedFiles, allFilesSelected, columnId)
                    }
                }
            }
        }

        var callback = function (mutationsList: MutationRecord[], dvTable: FileClassDataviewTable) {
            const selectedFiles: string[] = []
            let allFilesSelected: boolean = false
            const filesCheckboxes: HTMLInputElement[] = []
            for (var mutation of mutationsList) {
                if (mutation.type == "childList") {
                    for (const node of mutation.addedNodes) {
                        if (
                            "className" in node &&
                            typeof (node as HTMLElement).className === "string" &&
                            (node as HTMLElement).className.includes('dataview table-view-table')
                        ) {
                            const table = node as HTMLTableElement
                            cleanTable(table)
                            for (const row of table.rows) {
                                const cell = row.cells.item(0)
                                if (cell) buildCellCheckBox(table, cell, filesCheckboxes, allFilesSelected, selectedFiles)
                            }
                            if (table.tHead) buildHeaderCols(dvTable, table, selectedFiles, allFilesSelected)
                        } else if (
                            "className" in node &&
                            typeof (node as HTMLElement).className === "string" &&
                            (node as HTMLElement).className.includes('internal-embed')
                        ) {
                            const src = (node as HTMLElement).getAttr("src")
                            if (src && node.nodeName === "SPAN" && Object.keys(extensionMediaTypes).some(extension => src.endsWith(extension))) {
                                for (const child of node.childNodes) { node.removeChild(child) }
                                const img = node.createEl("img")
                                img.src = dvTable.plugin.app.vault.adapter.getResourcePath(src)
                                img.style.width = "40px"
                                img.style.borderRadius = "var(--image-radius)";
                                node.appendChild(img)
                            }
                        }
                    }
                } else if (mutation.type == "attributes") {
                    for (const node of mutation.addedNodes) {

                    }
                }
            }
        };
        const observer = new MutationObserver(mutationList => callback(mutationList, this));
        this.observers.push(observer)
        if (observed) observer.observe(observed, { childList: true, subtree: true });
    }

    public buildTable(tableContainer: HTMLDivElement): void {
        if (this.view instanceof FileClassTableView) this.addLinkClickEvent(tableContainer)
        this.buildBulkModifiers(tableContainer)
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
        if (dvApi) {
            dvApi.executeJs(this.buildDvJSRendering(), tableContainer, this.view.manager, this.fileClass.getClassFile().path)
        }
    }

    public buidFileClassViewBtn(): void {
        const id = this.view.tableId
        if (document.querySelector(`#${id} thead th .fileclass-icon`)) return
        const firstColHeader = document.querySelector(`#${id} thead th `)
        if (firstColHeader instanceof Element) {
            firstColHeader.addClass("first-col-header-cell")
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
            const checkBoxContainer = firstColHeaderContainer.querySelector(".modifier-selector")
            if (checkBoxContainer) firstColHeaderContainer?.insertAfter(button, checkBoxContainer)
            else firstColHeaderContainer.prepend(button)
        }
    }

    private addClickEventToLink(link: HTMLLinkElement): void {
        link.addEventListener("click", (e) => {
            e.preventDefault()
            this.plugin.app.workspace.openLinkText(
                //@ts-ignore
                link.getAttr("data-href")?.replace(/(.*).md/, "$1"),
                this.fileClass.getClassFile().path,
                'tab'
            )
        })
    }

    private buildFilterQuery(): string {
        return Object.entries(this.viewConfiguration.filters).map(([index, filter]) => {
            const valueGetter = filter.name === "file" ? `p.file.name` : `p["${filter.name}"]`;
            let normalizedValueGetter = valueGetter;
            if (this.plugin.settings.ignoreDiacriticsInTableViewSearch) {
                normalizedValueGetter = `${valueGetter}?.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")`;
            }
            const current = this.ctx ? `dv.page("${this.ctx.sourcePath}")` : "{}";

            if (filter.customFilter) {
                return `    .filter(p => (new Function("value","current", "dv", "${filter.customFilter}"))(${normalizedValueGetter}, ${current}, dv))`;
            }

            if (filter.query) {
                const value = filter.query;
                if (!value.startsWith("/")) {
                    let values = value.split(",").map(item => item.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                    const empty = values.find(v => v === "__empty__");
                    const notEmpty = values.find(v => v === "__notEmpty__");
                    const notFound = values.find(v => v === "__notFound__");
                    const existing = values.find(v => v === "__existing__");
                    values = values.filter(v => !Object.keys(fieldStates).includes(v));

                    if (empty) {
                        return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} === null)\n`;
                    } else if (notEmpty) {
                        return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} !== null)\n`;
                    } else if (notFound) {
                        return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} === undefined)\n`;
                    } else if (existing) {
                        return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} !== undefined)\n`;
                    } else if (values.length) {
                        const fCField = filter.name !== "file" ? this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name)?.find(f => f.name === filter.name) : undefined;
                        if (fCField?.type === "Boolean") {
                            switch (value) {
                                case 'true':
                                    return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} === true)\n`;
                                case 'false':
                                    return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${valueGetter} === false)\n`;
                                case 'false, true':
                                case 'true, false':
                                    return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && [true, false].some(b => ${valueGetter} === b))\n`;
                                default:
                                    return "";
                            }
                        } else {
                            const valuesQueries = values.map(val => `${normalizedValueGetter}.toLowerCase().includes("${val}".toLowerCase())`);
                            return `    .filter(p => hasFileClass(p.file.path, "${filter.id}") && ${normalizedValueGetter} && (${valuesQueries.join(" || ")}))\n`;
                        }
                    } else {
                        return "";
                    }
                } else {
                    const cleaned = value.replace(/^\//, "").replace(/\/$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    let isValid = true;
                    try {
                        new RegExp(cleaned);
                    } catch (error) {
                        isValid = false;
                    }
                    if (isValid) return `    .filter(p => ${normalizedValueGetter} && new RegExp("${cleaned}").test(${normalizedValueGetter}))\n`;
                    else return "";
                }
            } else {
                return "";
            }
        }).join("");
    }

    private buildSorterQuery(): string {
        const buildCOp = (fieldKey: string, cO: string, index: number, dir: number) => {
            return `rank(basename(p${index}${fieldKey}),[${cO}], ${dir})`
        }
        const buildOp = (fieldKey: string, index: number) => {
            return `basename(p${index}${fieldKey})`
        }
        const sorters = Object.entries(this.viewConfiguration.sorters)
            .sort((s1, s2) => (s1[1].priority || 0) < (s2[1].priority || 0) ? -1 : 1)
            .filter(s => s[1].direction)
            .map(s => {
                const fieldKey = s[1].name === "file" ? `["file"]["name"]` : `["${s[1].name}"]`
                const dir = s[1].direction === "asc" ? 1 : -1
                if (s[1].customOrder?.length) {
                    const cO = s[1].customOrder.map(item => `"${item}"`).join(",")
                    return `` +
                        `        if(${buildCOp(fieldKey, cO, 1, dir)} > ${buildCOp(fieldKey, cO, 2, dir)}) return ${dir}\n` +
                        `        if(${buildCOp(fieldKey, cO, 1, dir)} < ${buildCOp(fieldKey, cO, 2, dir)}) return ${-1 * dir}\n`
                } else {
                    return `` +
                        `        if(${buildOp(fieldKey, 1)} > ${buildOp(fieldKey, 2)}) return ${dir}\n` +
                        `        if(${buildOp(fieldKey, 1)} < ${buildOp(fieldKey, 2)}) return ${-1 * dir}\n`
                }
            })
        const sortingQuery = `    .array().sort((p1, p2) => {\n${sorters.join("")}\n    })\n`
        return sortingQuery
    }

    private buildDvJSQuery(): string {
        let dvQuery = "";
        const classFilesPath = this.plugin.settings.classFilesPath
        const templatesFolder = this.plugin.app.plugins.plugins["templater-obsidian"]?.settings["templates_folder"];
        dvQuery += `dv.pages()\n`;
        dvQuery += `    .filter(p => fileClassFiles.includes(p.file.path)
        ${!!classFilesPath ? "        && !p.file.path.includes('" + classFilesPath + "')\n" : ""}
        ${templatesFolder ? "        && !p.file.path.includes('" + templatesFolder + "')\n" : ""}
        )\n`;
        dvQuery += this.buildFilterQuery();
        return dvQuery;
    }

    private buildDvJSRendering(): string {
        const buildColumnName = (column: Column) => {
            const hasChildren = this.viewConfiguration.children.length
            if (column.name === "file") return `${this.fileClass.name}${this.count ? " (" + this.count + ")" : ""}`
            const [fileClassName, fieldName] = column.id.split("____")
            this.columnsFileClassField[column.id] = { fileClassName, fieldName }
            return `<span class='column-id' id='${column.id}'/>${hasChildren ? column.id.replace("____", ": ") : column.name}</span>`
        }
        const columns = this.viewConfiguration.columns
            .filter(f => !this.viewConfiguration.columns.find(_f => _f.id === f.id)?.hidden)
            .sort((f1, f2) => f1.position < f2.position ? -1 : 1)
        let dvJS = "const {fieldModifier: f} = MetadataMenu.api;\n" +
            "const fFC = MetadataMenu.fieldIndex.filesFileClasses\n" +
            `const fileClassesNames = ["${this.fileClass.name}", ...[${this.viewConfiguration.children.map(c => "'" + c + "'").join(", ")}]];\n` +
            `const fileClassFiles = [...fFC.keys()].filter(path => fFC.get(path)?.some(_fileClass => fileClassesNames.includes(_fileClass.name)))\n` +
            "const basename = (item) => {\n" +
            "    if(item && item.hasOwnProperty('path')){\n" +
            "        return /([^\/]*).md/.exec(item.path)?.[1] || item.path\n" +
            "    }else if(typeof item === 'string'){\n" +
            "        return item\n" +
            "    }else{\n" +
            "        const numVal = parseFloat(item?.toString()) \n" +
            "        return !isNaN(numVal) ? numVal : item?.toString() || '' \n" +
            "    }\n" +
            "}\n" +
            "const fileFileClasses = (path) => {\n" +
            "    return MetadataMenu.fieldIndex.filesFileClasses.get(path)?.map(_fC => _fC.name) || [] \n" +
            "}\n" +
            "const hasFileClass = (path, id) => {\n" +
            "    if(id.includes('____')){\n" +
            "        const fileClassName = id.split('____')[0]\n" +
            "        return fileFileClasses(path).includes(fileClassName)\n" +
            "    } else {\n" +
            "        return true" +
            "    }\n" +
            "}\n" +
            "const rank = (item, options, dir) => {\n" +
            "    const indexInOptions = options.indexOf(basename(item));\n" +
            "    if(dir === 1){\n" +
            "        if(indexInOptions === -1) return Infinity\n" +
            "    }\n" +
            "    return indexInOptions\n" +
            "}\n" +
            "dv.table([\n";
        dvJS += columns.map(column => `"${buildColumnName(column)}"`).join(",");
        dvJS += `], \n`;
        dvJS += this.buildDvJSQuery();
        dvJS += this.buildSorterQuery();
        dvJS += `    .slice(${this.sliceStart}, ${this.sliceStart + this.limit})\n`;
        dvJS += "    .map(p => [\n";
        dvJS += columns.map(column => {
            if (column.name === "file") {
                return "        dv.el(\"div\", p.file.link, {cls: \"field-name\"})";
            } else {
                return `        hasFileClass(p.file.path, "${column.id}") ? f(dv, p, "${column.name}", {options: {alwaysOn: false, showAddField: ${this.view.manager.showAddField}}}) : ""`
            }
        }).join(",\n");
        dvJS += "    \n])";
        dvJS += "\n);"
        return dvJS
    }
}