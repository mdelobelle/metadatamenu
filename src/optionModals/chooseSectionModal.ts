import { Modal, DropdownComponent, TFile } from "obsidian";
import fieldSelectModal from "./fieldSelectModal";
import MetadataMenu from "main";
import { FileClass } from "src/fileClass/fileClass";
import { FieldType } from "src/types/fieldTypes";
import Field from "src/fields/Field";
import { FieldManager } from "src/types/fieldTypes";
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

    private createAndOpenModal(field: Field | undefined, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        if (field) {
            const fieldManager = new FieldManager[field.type](field);
            fieldManager.createAndOpenFieldModal(this.app, this.file, this.fieldName, lineNumber, inFrontmatter, top);
        } else {
            const fieldManager = F.createDefault(this.fieldName!);
            fieldManager.createAndOpenFieldModal(this.app, this.file, this.fieldName!, lineNumber, inFrontmatter, top);
        }
    }

    async onOpen() {
        this.titleEl.setText(`Add a ${this.fieldName ? "<" + this.fieldName + "> " : ""}field in this note after:`);
        const inputDiv = this.contentEl.createDiv({ cls: "metadata-menu-modal-value" });

        const selectEl = new DropdownComponent(inputDiv);
        selectEl.selectEl.addClass("metadata-menu-select");
        selectEl.addOption("", "Select line");
        selectEl.addOption("top_0", "top");
        const result = await this.app.vault.read(this.file)
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
            if (!this.fieldName) {
                const modal = new fieldSelectModal(this.plugin, this.file, lineNumber, result.split('\n')[lineNumber], inFrontmatter, top, this.fileClass);
                this.close();
                modal.open();
            } else {
                if (this.fileClass) {
                    const fileClassAttributesWithName = this.fileClass.attributes.filter(attr => attr.name == this.fieldName);
                    let field: Field | undefined
                    let type: FieldType | undefined
                    if (fileClassAttributesWithName.length > 0) {
                        const fileClassAttribute = fileClassAttributesWithName[0];
                        field = fileClassAttribute.getField();
                        type = fileClassAttribute.type
                    }
                    this.createAndOpenModal(field, lineNumber, inFrontmatter, top);
                    this.close()
                } else {
                    const field = this.plugin.settings.presetFields.filter(_field => _field.name == this.fieldName)[0];
                    this.createAndOpenModal(field, lineNumber, inFrontmatter, top);
                    this.close();
                };
            }
        });
    };
};