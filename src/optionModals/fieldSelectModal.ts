import { Modal, DropdownComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import addNewFieldModal from "./addNewFieldModal";
import { FileClass } from "src/fileClass/fileClass";
import Field from "src/fields/Field";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import Managers from "src/fields/fieldManagers/Managers";

export default class fieldSelectModal extends Modal {

    // choose a field type after "add field at section command"

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
                let type: FieldType | undefined
                if (fileClassAttributesWithName.length > 0) {
                    const fileClassAttribute = fileClassAttributesWithName[0];
                    field = fileClassAttribute.getField();
                    type = fileClassAttribute.type
                }
                if (field) {
                    const fieldManager = new FieldManager[field.type](field);
                    fieldManager.createAndOpenFieldModal(this.app, this.file, selectedFieldName, this.lineNumber, this.inFrontmatter, this.top);
                }
                this.close()
            } else {
                const field = this.plugin.settings.presetFields.filter(_field => _field.name == selectedFieldName)[0];
                const fieldManager = new FieldManager[field.type](field);
                fieldManager.createAndOpenFieldModal(this.app, this.file, selectedFieldName, this.lineNumber, this.inFrontmatter, this.top);
                this.close();
            };
        });
    };
};