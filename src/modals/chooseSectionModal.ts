import { TFile, ButtonComponent, SuggestModal } from "obsidian";
import MetadataMenu from "main";

interface Line {
    lineNumber: number
    lineText: string
}

export default class chooseSectionModal extends SuggestModal<Line> {

    private addAsListItem: boolean = false;
    private addAsComment: boolean = false;
    private addAtEndOfFrontMatter: boolean = false;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private onSelect: (lineNumber: number, asList: boolean, asComment: boolean) => void,
    ) {
        super(plugin.app);
        this.onSelect = onSelect
        this.containerEl.addClass("metadata-menu")
        this.resultContainerEl.addClass("sections")
    };

    onOpen(): void {
        super.onOpen();
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        // insertAsListItem
        const addAsListItemBtn = new ButtonComponent(inputContainer)
        addAsListItemBtn.setIcon("list")
        addAsListItemBtn.onClick(() => {
            if (this.addAsListItem) {
                addAsListItemBtn.removeCta();
                this.addAsListItem = false
            } else {
                addAsListItemBtn.setCta();
                this.addAsListItem = true
            }
        })
        addAsListItemBtn.setDisabled(this.addAtEndOfFrontMatter)
        addAsListItemBtn.setTooltip("Add this field as a list item")

        // insertAsCommentItem

        const addAsCommentItemBtn = new ButtonComponent(inputContainer)
        addAsCommentItemBtn.setIcon("message-square")
        addAsCommentItemBtn.onClick(() => {
            if (this.addAsComment) {
                addAsCommentItemBtn.removeCta();
                this.addAsComment = false
            } else {
                addAsCommentItemBtn.setCta();
                this.addAsComment = true
            }
        })
        addAsCommentItemBtn.setDisabled(this.addAtEndOfFrontMatter)
        addAsCommentItemBtn.setTooltip("Add this field as a comment item")


        // insertAsCommentItem

        const addAtEndOfFrontMatterBtn = new ButtonComponent(inputContainer)
        addAtEndOfFrontMatterBtn.setIcon("list-end")
        addAtEndOfFrontMatterBtn.onClick(() => {
            this.onSelect(-1, false, false)
            this.close();
        })
        addAtEndOfFrontMatterBtn.setTooltip("Add this field at the end of the frontmatter")
    }

    async getSuggestions(query: string): Promise<Line[]> {
        const content = await this.plugin.app.vault.read(this.file)
        const suggestions: Line[] = [{
            lineNumber: -1,
            lineText: "----------Add on top of the file--------"
        }]
        content.split("\n")
            .forEach((lineContent, i) => {
                if (lineContent.toLowerCase().includes(query.toLowerCase())) {
                    suggestions.push({
                        lineNumber: i,
                        lineText: lineContent.substring(0, 57) + (lineContent.length < 57 ? "" : "...")
                    })
                }
            })

        return suggestions;
    }

    renderSuggestion(value: Line, el: HTMLElement) {
        el.addClass("item")
        const container = el.createDiv({ cls: "line" });
        container.createDiv({ text: `${value.lineNumber + 1}`, cls: "lineNumber" });
        container.createDiv({ text: value.lineText, cls: "lineText" });
    }

    onChooseSuggestion(item: Line, evt: MouseEvent | KeyboardEvent) {
        this.onSelect(item.lineNumber == -1 ? 0 : item.lineNumber,
            this.addAsListItem,
            this.addAsComment)
    }
};