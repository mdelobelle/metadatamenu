import { TextComponent, Debouncer, setIcon, ButtonComponent } from "obsidian";
import { OptionsMultiSelectModal } from "./OptionsMultiSelectModal";
import { FieldSet } from "./tableViewFieldSet";
import { CustomFilterModal } from "./CustomFilterModal";

export class FilterComponent {
    public filter: TextComponent
    public query: string
    public customFilter: string
    public filterBtn: ButtonComponent
    constructor(
        public container: HTMLDivElement,
        public name: string,
        public parentFieldSet: FieldSet,
        public debounced: Debouncer<[fieldset: FieldSet], void>
    ) {
        this.build()
    }

    private build() {
        this.filter = new TextComponent(this.container);
        this.container.addClass("filter-with-dropdown")
        this.filter.setValue("");
        this.filter.onChange((value) => {
            this.filter.inputEl.value = value;
            this.debounced(this.parentFieldSet)
        });
        if (this.name !== "file") {
            this.buildDropdownBtn()
        }
        this.buildCustomFilterBtn()
    }

    public buildDropdownBtn(): void {
        const button = this.container.createEl("button", { cls: "infield-button" })
        this.filter.inputEl.parentElement?.appendChild(button)
        setIcon(button, "chevron-down")
        button.onclick = () => {
            const plugin = this.parentFieldSet.plugin
            const fileClass = this.parentFieldSet.fileClass
            const fileClassFile = fileClass.getClassFile()
            const field = plugin.fieldIndex.fileClassesFields.get(fileClass.name)?.find(f => f.isRoot() && f.name === this.name);
            (new OptionsMultiSelectModal(plugin, fileClassFile, field || "file", this.parentFieldSet)).open()
        }
    }

    public toggleCustomFilterState() {
        if (this.customFilter) this.filterBtn.buttonEl.addClass("active")
        else this.filterBtn.buttonEl.removeClass("active")
    }

    public buildCustomFilterBtn(): void {
        this.filterBtn = new ButtonComponent(this.container)
        this.filterBtn.buttonEl.addClass("infield-button")
        this.filter.inputEl.parentElement?.appendChild(this.filterBtn.buttonEl)
        this.filterBtn.setIcon("code-2")
        this.filterBtn.onClick(() => {
            const plugin = this.parentFieldSet.plugin;
            new CustomFilterModal(plugin, this.parentFieldSet, this).open()
        })
    }

    public reset() {
        this.filter.inputEl.value = ""
        this.customFilter = ""
        this.toggleCustomFilterState()
    }

}