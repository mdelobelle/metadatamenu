import { App, FuzzyMatch, FuzzySuggestModal, setIcon } from "obsidian";

interface Option {
    id: string,
    actionLabel: string,
    action: any,
    icon?: string
}

export default class FieldCommandSuggestModal extends FuzzySuggestModal<Option> {
    public options: Option[] = []

    constructor(app: App) {
        super(app);
        this.containerEl.addClass("metadata-menu");
    }

    getItems(): Option[] {
        return this.options
    }

    getItemText(item: Option): string {
        return item.actionLabel
    }

    onChooseItem(item: Option, evt: MouseEvent | KeyboardEvent): void {
        item.action();
    }

    renderSuggestion(item: FuzzyMatch<Option>, el: HTMLElement): void {
        el.addClass("value-container");
        const iconContainer = el.createDiv({ cls: "icon-container" })
        item.item.icon ? setIcon(iconContainer, item.item.icon) : setIcon(iconContainer, "pencil")
        const actionLabel = el.createDiv()
        actionLabel.innerHTML = item.item.actionLabel
    }
};