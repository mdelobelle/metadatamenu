import MetadataMenu from "main";
import { ButtonComponent, TextComponent } from "obsidian";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "./fileClass";

const oppositeDirection = {
    'asc': 'desc',
    'desc': 'asc'
}

export class FileClassTableView {
    private plugin: MetadataMenu;
    public container: HTMLDivElement
    private limit: number
    private tableContainer: HTMLDivElement
    private filters: Record<string, TextComponent> = {}
    private sorters: Record<string, { btn: ButtonComponent, active: boolean, direction: 'asc' | 'desc', name: string }> = {}
    private refreshButton: ButtonComponent
    private paginationContainer: HTMLDivElement
    private sliceStart: number = 0
    private firstCollWidth: number;
    private tableFontSize: number;

    constructor(
        plugin: MetadataMenu,
        private component: FileClassManager,
        private viewContainer: HTMLDivElement,
        private fileClass: FileClass
    ) {
        this.plugin = plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-table" })
        this.limit = this.fileClass.getFileClassOptions().limit
        this.createHeader();
    };

    private createHeader(): void {
        const header = this.container.createDiv({ cls: "options" })
        const limitContainer = header.createDiv({ cls: "limit" });
        this.paginationContainer = header.createDiv({ cls: "pagination" });
        const fieldsContainer = header.createDiv({ cls: "fields" })
        const applyContainer = header.createDiv({ cls: "footer" })
        this.buildLimitManager(limitContainer);
        this.buildPaginationManager(this.paginationContainer)
        this.buildFiltersAndSortManager(fieldsContainer);
        this.buildRefreshManager(applyContainer);
        this.buildCleanFilters(applyContainer);
    }

    public udpate(): void {
        this.buildTable();
        this.buildPaginationComponent(this.paginationContainer);
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
                        console.log(this.tableFontSize, this.firstCollWidth, position)
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

    private buildPaginationComponent(container: HTMLDivElement): void {
        container.replaceChildren();

        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
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
        }
    }

    private buildPaginationManager(container: HTMLDivElement): void {
        this.buildPaginationComponent(container);
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

    private toggleBtnState(name: string, direction: 'asc' | 'desc'): void {
        const btnName = `${name}__${direction}`;
        const oppositeBtnName = `${name}__${oppositeDirection[direction]}`
        const { btn, active } = this.sorters[btnName]
        const { btn: oppBtn } = this.sorters[oppositeBtnName]
        if (active) {
            btn.buttonEl.removeClass("active");
            this.sorters[btnName].active = false
        } else {
            btn.setClass("active")
            oppBtn.buttonEl.removeClass("active");
            this.sorters[btnName].active = true;
            this.sorters[oppositeBtnName].active = false;
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
        fieldNameAndSortContainer.createDiv({ text: label, cls: "field-name" })
    }

    private buildFilterComponent(name: string, container: HTMLDivElement): void {
        const fieldFilterContainer = container.createDiv({ cls: "filter-input" });
        const filter = new TextComponent(fieldFilterContainer);
        filter.setValue("");
        filter.onChange(() => this.refreshButton.setCta());
        this.filters[name] = filter;
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

    private buildRefreshManager(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        this.refreshButton = new ButtonComponent(btnContainer);
        this.refreshButton.setIcon("refresh-ccw");
        this.refreshButton.onClick(() => {
            this.udpate()
        })
    }

    private buildCleanFilters(container: HTMLDivElement): void {
        const btnContainer = container.createDiv({ cls: "cell" })
        const cleanFilterBtn = new ButtonComponent(btnContainer);
        cleanFilterBtn.setIcon("eraser");
        cleanFilterBtn.onClick(() => {
            Object.values(this.filters).forEach(filter => filter.setValue(""))
            this.refreshButton.setCta()
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
        return Object.entries(this.sorters).map(([fieldSorter, { btn, active, direction, name }]) => {
            const fieldKey = name === "file" ? "p.file.name" : `p["${name}"]`
            if (active) {
                return `    .sort(p => ${fieldKey}, "${direction}")\n`
            } else {
                return ""
            }
        }).join("")
    }

    private buildDvJSQuery(): string {
        const tagsMappedToFileClass: string[] = []
        this.plugin.fieldIndex.tagsMatchingFileClasses.forEach((cls, tag) => {
            if (this.fileClass.name === cls.name) {
                tagsMappedToFileClass.push('#' + tag)
            }
        })

        let dvQuery = "";
        const fileClassAlias = this.plugin.settings.fileClassAlias
        const classFilesPath = this.plugin.settings.classFilesPath
        const templatesFolder = this.plugin.app.plugins.plugins["templater-obsidian"]?.settings["templates_folder"];
        dvQuery += `dv.pages()\n`;
        dvQuery += `    .where(p =>\n
        (\n
            (typeof(p['${fileClassAlias}']) === 'string' && p['${fileClassAlias}'] === '${this.fileClass.name}')\n
            || (Array.isArray(p['${fileClassAlias}']) && p['${fileClassAlias}'].includes('${this.fileClass.name}'))\n
            || p.file.etags.values.some(et => ${JSON.stringify(tagsMappedToFileClass)}.some(t => et.startsWith(t)))\n
        )\n
        ${!!classFilesPath ? "        && !p.file.path.includes('" + classFilesPath + "')\n" : ""}
        ${templatesFolder ? "        && !p.file.path.includes('" + templatesFolder + "')\n" : ""}
        )\n`;
        dvQuery += this.buildFilterQuery();
        return dvQuery;
    }

    private buildDvJSRendering(): string {
        const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name) || []
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