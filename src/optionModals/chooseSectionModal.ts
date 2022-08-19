import { Modal, DropdownComponent, TFile, ToggleComponent, ButtonComponent } from "obsidian";
import MetadataMenu from "main";
import { FileClass } from "src/fileClass/fileClass";
import { FieldManager as F } from "src/fields/FieldManager";

export default class chooseSectionModal extends Modal {

    private plugin: MetadataMenu;
    private file: TFile;
    private fileClass?: FileClass
    private fieldName?: string

    constructor(plugin: MetadataMenu, file: TFile, fileClass?: FileClass, fieldName?: string) {
        super(plugin.app);
        this.file = file;
        this.plugin = plugin;
        this.fileClass = fileClass
        this.fieldName = fieldName
    };

    async onOpen() {

        const result = await this.app.vault.read(this.file)
        this.titleEl.setText(`Add a ${this.fieldName ? "<" + this.fieldName + "> " : ""}field in this note after:`);
        const container = this.contentEl.createDiv();

        const selectEl = new DropdownComponent(container);
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
        selectEl.onChange(() => {
            const valueArray = selectEl.getValue().match(/(\w+)_(\d+)/);
            const position = valueArray && valueArray.length > 0 ? valueArray[1] : 0;
            const lineNumber = Number(valueArray && valueArray.length > 1 ? valueArray[2] : 0);
            const inFrontmatter = position == "frontmatter" ? true : false;
            const top = position == "top" ? true : false;
            F.openFieldOrFieldSelectModal(this.plugin, this.file, this.fieldName, lineNumber, result.split('\n')[lineNumber], inFrontmatter, top, this.fileClass)
            this.close();
        });


        if (app.metadataCache.getCache(this.file.path)?.frontmatter) {
            const addToFrontMatterBtn = new ButtonComponent(container)
            addToFrontMatterBtn.setClass("metadata-menu-field-add-frontmatter-btn")
            addToFrontMatterBtn.setButtonText("Add to frontmatter")
            addToFrontMatterBtn.onClick(() => {
                const lineNumber = result.split("\n").slice(1).findIndex(l => l === "---")
                F.openFieldOrFieldSelectModal(this.plugin, this.file, this.fieldName, lineNumber, result.split('\n')[lineNumber], true, false, this.fileClass)
                this.close();
            })
        }
    };
};