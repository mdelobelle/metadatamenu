import { ButtonComponent, setIcon, SuggestModal } from "obsidian";
import MetadataMenu from "main";
import { FieldSet } from "src/fileClass/views/tableViewComponents/tableViewFieldSet";
import { cleanActions } from "src/utils/modals";
import { FileClass, FileClassChild } from "src/fileClass/fileClass";

export class ChildrenMultiSelectModal extends SuggestModal<FileClassChild>{
    private selectedChildren: Array<FileClassChild>;

    constructor(
        public plugin: MetadataMenu,
        public fileClass: FileClass,
        public parentFieldSet: FieldSet
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildFooterActions(footerActionsContainer)
        const initialOptions = this.parentFieldSet.children
        if (initialOptions) this.selectedChildren = [...initialOptions]
        console.log(this.selectedChildren)
        this.containerEl.onkeydown = (e) => {
            if (e.key == "Enter" && e.altKey) {
                this.parentFieldSet.reset(this.selectedChildren)
                this.close();
            }
        }
    };

    private isSelected(value: FileClassChild) {
        return this.selectedChildren.map(c => c.fileClass.name).includes(value.fileClass.name)
    }

    getSuggestions(query: string): FileClassChild[] {
        const children = this.fileClass.getChildren().filter(c => !query || c.name.toLocaleLowerCase() === query.toLocaleLowerCase())
        const sortedChildren = children.sort((c1, c2) => c1.path.join(" > ") < c2.path.join(" > ") ? -1 : 1)
        return sortedChildren
    }

    buildFooterActions(footerActionsContainer: HTMLDivElement) {
        footerActionsContainer.createDiv({ cls: "spacer" })
        //confirm button
        this.buildConfirm(footerActionsContainer)
        //cancel button
        const cancelButton = new ButtonComponent(footerActionsContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(footerActionsContainer)
        clearButton.setIcon("filter-x")
        clearButton.setTooltip("Clear filtered value(s)")
        clearButton.onClick(async () => {
            const fieldSet = this.parentFieldSet
            const view = fieldSet.tableView
            fieldSet.children = []
            view.build()
            view.update()
            view.saveViewBtn.setCta()
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(footerActionsContainer)
    }

    buildConfirm(footerActionsContainer: HTMLDivElement) {
        const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const confirmButton = new ButtonComponent(footerActionsContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            this.parentFieldSet.reset(this.selectedChildren)
            this.close();
        })
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: FileClassChild[] = chooser.values
        suggestions.forEach((s, i) => {
            if (this.isSelected(values[i])) {
                s.addClass("value-checked")
                if (s.querySelectorAll(".icon-container").length == 0) {
                    const iconContainer = s.createDiv({ cls: "icon-container" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("value-checked")
                s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
            }
        })
    }

    renderSuggestion(value: FileClassChild, el: HTMLElement) {
        const labelContainer = el.createDiv({ cls: "label-with-icon-container" })
        const icon = labelContainer.createDiv({ cls: "icon" })
        setIcon(icon, value.fileClass.getIcon())
        const label = labelContainer.createDiv({ cls: "label" })
        label.setText(`${value.path.join(" > ")}`)
        el.addClass("value-container")
        const spacer = this.containerEl.createDiv({ cls: "spacer" })
        el.appendChild(spacer)
        if (this.isSelected(value)) {
            el.addClass("value-checked")
            const iconContainer = el.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    selectSuggestion(value: FileClassChild, evt: MouseEvent | KeyboardEvent): void {
        if (this.isSelected(value)) {
            const child = this.selectedChildren.find(c => c.fileClass.name === value.fileClass.name)
            if (child) this.selectedChildren.remove(child)
        } else {
            this.selectedChildren.push(value)
        }
        this.renderSelected()
    }
    onChooseSuggestion(item: FileClassChild, evt: MouseEvent | KeyboardEvent) { }
}