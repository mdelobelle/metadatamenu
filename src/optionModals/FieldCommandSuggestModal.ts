import { App, FuzzyMatch, FuzzySuggestModal, setIcon } from "obsidian";

interface Option {
    id: string,
    actionLabel: string,
    action: any,
    icon?: string
}

export default class FieldCommandSuggestModal extends FuzzySuggestModal<Option> {
    public app: App;
    public options: Option[] = []

    constructor(app: App) {
        super(app);
        this.app = app;
    };

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
        el.addClass("metadata-menu-command-suggest-item")
        const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
        item.item.icon ? setIcon(iconContainer, item.item.icon) : setIcon(iconContainer, "pencil")
        const actionLabel = el.createDiv({ cls: "metadata-menu-command-suggest-action-label" })
        actionLabel.innerHTML = item.item.actionLabel
    }
};