import MetadataMenu from "main";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "./fileClass";
import { FileClassFieldsView } from "./fileClassFieldsView";

export const FILECLASS_VIEW_TYPE = "FileClassView"


class MenuOption {

    private itemContainer: HTMLDivElement

    constructor(
        private menu: HTMLDivElement,
        public id: string,
        private name: string,
        public relatedView: HTMLDivElement,
        private view: FileClassView,
    ) {
        this.itemContainer = this.menu.createDiv({ cls: "fv-menu-item", attr: { id: this.id } })
        this.itemContainer.createEl("h2", { text: this.name })
        this.itemContainer.onclick = () => {
            this.view.updateDisplayView(this.id);
        }
    }

    toggleInactive(): void {
        this.itemContainer.removeClass("active");
        this.relatedView.hide();
    }

    toggleActive(): void {
        this.itemContainer.addClass("active")
        this.relatedView.show();
    }
}

export class FileClassView extends ItemView {

    private menu: HTMLDivElement
    private menuOptions: MenuOption[] = []
    private viewContainer: HTMLDivElement
    private views: HTMLDivElement[] = []
    private settingsView: HTMLDivElement
    private tableView: HTMLDivElement
    private fieldsView: FileClassFieldsView

    constructor(
        public leaf: WorkspaceLeaf,
        private plugin: MetadataMenu,
        private component: FileClassManager,
        public name: string,
        public fileClass: FileClass
    ) {
        super(leaf)
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("fileclass-view")
        this.navigation = false;
        this.icon = "file-spreadsheet"
        this.onunload = () => {
            //@ts-ignore
            this.plugin.app.viewRegistry.unregisterView(FILECLASS_VIEW_TYPE + "__" + this.fileClass.name);
            this.plugin.removeChild(this.component)
            this.unload()
        }
        this.buildLayout();
    }

    updateDisplayView(id: string) {
        ([...this.viewContainer.children] as HTMLDivElement[]).forEach(view => view.hide());
        this.menuOptions.forEach(option => option.id === id ? option.toggleActive() : option.toggleInactive())
    }

    buildLayout(): void {
        this.menu = this.contentEl.createDiv({ cls: "fv-menu" });
        this.viewContainer = this.contentEl.createDiv()
        this.buildSettingsView();
        this.buildFieldsView();
        this.buildTableView();
        this.buildMenu();
        this.updateDisplayView("tableOption");
    }

    buildMenu(): void {
        this.menuOptions.push(new MenuOption(this.menu, "settingsOption", "Fileclass Settings", this.settingsView, this))
        this.menuOptions.push(new MenuOption(this.menu, "fieldsOption", "Fileclass Fields", this.fieldsView.container, this))
        this.menuOptions.push(new MenuOption(this.menu, "tableOption", "Tableview", this.tableView, this))
    }

    buildSettingsView(): void {
        //todo create the settings view and manage it!!
        this.settingsView = this.viewContainer.createDiv({ cls: "fv-settings", text: "Settings" });
        this.views.push(this.settingsView);
    }

    buildFieldsView(): void {
        this.fieldsView = new FileClassFieldsView(this.plugin, this.viewContainer, this.fileClass)
        this.views.push(this.fieldsView.container);
    }

    buildTableView(): void {
        this.tableView = this.viewContainer.createDiv({ cls: "fv-table" })
        this.views.push(this.tableView);
    }

    getDisplayText(): string {
        return this.name || "FileClass"
    }

    getViewType(): string {
        return this.fileClass ? FILECLASS_VIEW_TYPE + "__" + this.fileClass.name : FILECLASS_VIEW_TYPE
    }

    updateSettingsView(): void {
        this.fieldsView.buildSettings()
    }

    protected async onOpen(): Promise<void> {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        this.icon = this.fileClass?.getIcon() || "file-spreadsheet"
        if (dvApi) {
            dvApi.executeJs(this.buildDvJSQuery(), this.tableView, this, "")
        }
    }

    public buildDvJSQuery(): string | undefined {
        if (this.fileClass) {
            const fields = this.plugin.fieldIndex.fileClassesFields.get(this.fileClass.name) || []
            let dvQuery = "const {fieldModifier: f} = this.app.plugins.plugins[\"metadata-menu\"].api;\n" +
                "dv.table([\"File\",";
            dvQuery += fields.map(field => `"${field.name}"`).join(",");
            dvQuery += `], dv.pages()\n`;
            dvQuery += `    .where(p => p.fileClass === '${this.name}' || p.file.etags.values.includes('#${this.name}'))\n`;
            dvQuery += `    .slice(0, ${this.plugin.settings.tableViewMaxRecords})`;
            dvQuery += "    .map(p => [\n        p.file.link,\n";
            dvQuery += fields.map(field => `        f(dv, p, "${field.name}", {options: {alwaysOn: false, showAddField: true}})`).join(",\n");
            dvQuery += "    \n])\n);"
            return dvQuery
        }
    }
}