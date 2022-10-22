import { Modal, DropdownComponent, TFile, ButtonComponent } from "obsidian";
import MetadataMenu from "main";
import { FileClass } from "src/fileClass/fileClass";
import { FieldManager as F } from "src/fields/FieldManager";

export default class chooseSectionModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private fileClass?: FileClass,
        private fieldName?: string
    ) {
        super(plugin.app);
    };

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
                after,
                this.fileClass)
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
                    false,
                    this.fileClass)
                this.close();
            })
        }
    };
};