import { Modal, DropdownComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import addNewFieldModal from "./addNewFieldModal";
import valueTextInputModal from "./valueTextInputModal";
import valueSelectModal from "./valueSelectModal";
import valueToggleModal from "./valueToggleModal";
import valueMultiSelectModal from "./valueMultiSelectModal";
import { FileClass } from "src/fileClass/fileClass";
import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";

export default class fieldSelectModal extends Modal {

    private lineNumber: number;
    private line: string;
    private plugin: MetadataMenu;
    private file: TFile;
    private inFrontmatter: boolean;
    private top: boolean;
    private fileClass?: FileClass

    constructor(plugin: MetadataMenu, file: TFile, lineNumber: number, line: string, inFrontmatter: boolean, top: boolean, fileClass?: FileClass) {
        super(plugin.app);
        this.line = line;
        this.lineNumber = lineNumber;
        this.plugin = plugin;
        this.file = file;
        this.inFrontmatter = inFrontmatter;
        this.top = top;
        this.fileClass = fileClass
    };

    onOpen() {
        this.titleEl.setText(`Insert field after > ${this.line.substring(0, 20)}${this.line.length > 20 ? "..." : ""}`);
        const container = this.contentEl.createDiv({ cls: "metadata-menu-field-select" });

        const settingsDropdownContainer = container.createDiv();
        const settingsSelector = new DropdownComponent(settingsDropdownContainer);
        settingsSelector.addOption("---", "Choose Field");
        settingsSelector.addOption("++New", "New");
        if (this.fileClass) {
            this.fileClass.attributes.forEach(attr => {
                settingsSelector.addOption(attr.name, attr.name);
            })
        } else {
            this.plugin.settings.presetFields.forEach(setting => {
                settingsSelector.addOption(setting.name, setting.name);
            })
        };

        settingsSelector.onChange(selectedFieldName => {
            if (selectedFieldName == "++New") {
                const newFieldModal = new addNewFieldModal(this.plugin, this.lineNumber, this.file, this.inFrontmatter, this.top);
                newFieldModal.open();
                this.close();
            } else if (this.fileClass) {
                const fileClassAttributesWithName = this.fileClass.attributes.filter(attr => attr.name == selectedFieldName);
                let field: Field | undefined
                let type: string | undefined
                if (fileClassAttributesWithName.length > 0) {
                    const fileClassAttribute = fileClassAttributesWithName[0];
                    field = fileClassAttribute.getField();
                    type = fileClassAttribute.type
                }
                if (field) {
                    switch (type) {
                        case "cycle":
                        //fall-through
                        case "select": {
                            const fieldModal = new valueSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                        case "multi": {
                            const fieldModal = new valueMultiSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Select options for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                        case "boolean": {
                            const fieldModal = new valueToggleModal(this.app, this.file, field.name, false, this.lineNumber, this.inFrontmatter, this.top)
                            fieldModal.titleEl.setText(`Set value for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                        default: {
                            const fieldModal = new valueTextInputModal(this.app, this.file, field, "", this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
                            fieldModal.open();
                            "break"
                        };
                    }
                }
                this.close()
            } else {
                const field = this.plugin.settings.presetFields.filter(_field => _field.name == selectedFieldName)[0];
                switch (field.type) {
                    case FieldType.Multi:
                        {
                            const fieldModal = new valueMultiSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Select Options for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                    case FieldType.Cycle:
                    //fall-through
                    case FieldType.Select:
                        {
                            const fieldModal = new valueSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                    case FieldType.Boolean:
                        {
                            const fieldModal = new valueToggleModal(this.app, this.file, field.name, false, this.lineNumber, this.inFrontmatter, this.top)
                            fieldModal.titleEl.setText(`Set value for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                    case FieldType.Number:
                    //fall-through
                    case FieldType.Input:
                        {
                            const fieldModal = new valueTextInputModal(this.app, this.file, field, "", this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                    default:
                        {
                            const fieldModal = new valueTextInputModal(this.app, this.file, field, "", this.lineNumber, this.inFrontmatter, this.top);
                            fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
                            fieldModal.open();
                            break;
                        }
                }
                this.close();
            };
        });
    };
};