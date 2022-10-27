import { Modal, DropdownComponent, TFile, ButtonComponent, SuggestModal } from "obsidian";
import MetadataMenu from "main";
import { FieldManager as F } from "src/fields/FieldManager";
import { insertFrontmatterWithFields } from "src/commands/insertFrontmatterWithFields";

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
        private fieldName?: string
    ) {
        super(plugin.app);
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
            F.openFieldModal(
                this.plugin,
                this.file,
                this.fieldName,
                "",
                -2,
                true,
                false,
                false,
                false);
            this.close();
        })
        addAtEndOfFrontMatterBtn.buttonEl.addClass("metadata-menu-value-suggester-button")
        addAtEndOfFrontMatterBtn.setTooltip("Add this field at the end of the frontmatter")
        /*
        
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("eraser")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        clearButton.buttonEl.addClass("danger")
        clearButton.setTooltip("Clear the field value")
        */
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
        F.openFieldModal(
            this.plugin,
            this.file,
            this.fieldName,
            "",
            item.lineNumber == -1 ? 0 : item.lineNumber,
            inFrontmatter,
            after,
            this.addAsListItem,
            this.addAsComment)
    }
    /*
    async onOpen() {

        const result = await this.plugin.app.vault.read(this.file)
        this.titleEl.setText(`Add a ${this.fieldName ? "<" + this.fieldName + "> " : ""
            }field in "${this.file.basename.slice(0, 30)
            }${this.file.basename.length < 30 ? "..." : ""
            }" after:`);
        const selectEl = new DropdownComponent(this.contentEl);
        selectEl.selectEl.addClass("metadata-menu-field-add-section-select");
        selectEl.addOption("", "Select line");
        selectEl.addOption("top_0", "top");
        let foreHeadText = false;
        let frontmatterStart = false;
        let frontmatterEnd = false;
        let inFrontmatter = false;
        result.split("\n").forEach((line, lineNumber) => {
            if (line != "---" && !foreHeadText && !frontmatterStart) {
                foreHeadText = true;
            };
            if (line == "---" && !foreHeadText) {
                if (!frontmatterStart) {
                    frontmatterStart = true;
                    inFrontmatter = true;
                } else if (!frontmatterEnd) {
                    frontmatterEnd = true;
                    inFrontmatter = false;
                };
            }
            if (inFrontmatter) {
                selectEl.addOption(`frontmatter_${lineNumber}`, `${line.substring(0, 30)}${line.length > 30 ? "..." : ""}`);
            } else {
                selectEl.addOption(`body_${lineNumber}`, `${line.substring(0, 30)}${line.length > 30 ? "..." : ""}`);
            };
        });
        selectEl.selectEl.focus();
        selectEl.onChange(() => {
            const valueArray = selectEl.getValue().match(/(\w+)_(\d+)/);
            const position = valueArray && valueArray.length > 0 ? valueArray[1] : 0;
            const lineNumber = Number(valueArray && valueArray.length > 1 ? valueArray[2] : 0);
            const inFrontmatter = position == "frontmatter" ? true : false;
            const after = position == "top" ? false : true;
            F.openFieldModal(
                this.plugin,
                this.file,
                this.fieldName,
                "",
                lineNumber,
                inFrontmatter,
                after)
            this.close();
        });


        if (this.plugin.app.metadataCache.getCache(this.file.path)?.frontmatter) {
            const addToFrontMatterBtn = new ButtonComponent(this.contentEl)
            addToFrontMatterBtn.setClass("metadata-menu-field-add-frontmatter-btn")
            addToFrontMatterBtn.setButtonText("Add to frontmatter")
            addToFrontMatterBtn.onClick(() => {
                const lineNumber = this.plugin.app.metadataCache.getCache(this.file.path)!.frontmatter!.position.end.line - 1
                F.openFieldModal(
                    this.plugin,
                    this.file,
                    this.fieldName,
                    "",
                    lineNumber,
                    true,
                    false)
                this.close();
            })
        }
    };
    */
};