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
        private onSelect: (lineNumber: number, inFrontmatter: boolean, after: boolean, asList: boolean, asComment: boolean) => void,
    ) {
        super(plugin.app);
        this.onSelect = onSelect
    };

    onOpen(): void {
        super.onOpen();
        const inputContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-input-container" })
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
        addAsListItemBtn.buttonEl.addClass("metadata-menu-value-suggester-button")
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
        addAsCommentItemBtn.buttonEl.addClass("metadata-menu-value-suggester-button")
        addAsCommentItemBtn.setTooltip("Add this field as a comment item")


        // insertAsCommentItem

        const addAtEndOfFrontMatterBtn = new ButtonComponent(inputContainer)
        addAtEndOfFrontMatterBtn.setIcon("list-end")
        addAtEndOfFrontMatterBtn.onClick(() => {
            this.onSelect(-2, true, false, false, false)
            this.close();
        })
        addAtEndOfFrontMatterBtn.buttonEl.addClass("metadata-menu-value-suggester-button")
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
                        lineText: lineContent.substring(0, 37) + (lineContent.length < 37 ? "" : "...")
                    })
                }
            })

        return suggestions;
    }

    renderSuggestion(value: Line, el: HTMLElement) {
        el.addClass("metadata-menu-choose-section-modal-item")
        const container = el.createDiv({ cls: "metadata-menu-choose-section-modal-line" });
        container.createDiv({ text: `${value.lineNumber + 1}`, cls: "lineNumber" });
        container.createDiv({ text: value.lineText, cls: "lineText" });
    }

    onChooseSuggestion(item: Line, evt: MouseEvent | KeyboardEvent) {
        const frontmatter = this.plugin.app.metadataCache.getFileCache(this.file)?.frontmatter
        const inFrontmatter = frontmatter !== undefined && (item.lineNumber <= frontmatter.position.end.line)
        const after = item.lineNumber == -1 ? false : true;
        this.onSelect(item.lineNumber == -1 ? 0 : item.lineNumber,
            inFrontmatter,
            after,
            this.addAsListItem,
            this.addAsComment)
    }
};