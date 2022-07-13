import { Modal, DropdownComponent, TFile } from "obsidian";
import fieldSelectModal from "./fieldSelectModal";
import MetadataMenu from "main";

export default class chooseSectionModal extends Modal {

    private plugin: MetadataMenu;
    private file: TFile;

    constructor(plugin: MetadataMenu, file: TFile) {
        super(plugin.app);
        this.file = file;
        this.plugin = plugin;
    };

    onOpen() {
        this.titleEl.setText("Add a field in this note after:");
        const inputDiv = this.contentEl.createDiv({
            cls: "metadata-menu-modal-value"
        });
        const selectEl = new DropdownComponent(inputDiv);
        selectEl.selectEl.addClass("metadata-menu-select");
        selectEl.addOption("", "Select line");
        selectEl.addOption("top_0", "top");
        this.app.vault.read(this.file).then(result => {
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
            selectEl.onChange(value => {
                const valueArray = selectEl.getValue().match(/(\w+)_(\d+)/);
                const position = valueArray && valueArray.length > 0 ? valueArray[1] : 0;
                const lineNumber = Number(valueArray && valueArray.length > 1 ? valueArray[2] : 0);
                const inFrontmatter = position == "frontmatter" ? true : false;
                const top = position == "top" ? true : false;
                const modal = new fieldSelectModal(this.plugin, this.file, lineNumber, result.split('\n')[lineNumber], inFrontmatter, top);
                this.close();
                modal.open();
            });
        });
    };
};