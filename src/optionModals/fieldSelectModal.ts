import { Modal, DropdownComponent, TFile } from "obsidian";
import MetadataMenu from "main";
import addNewFieldModal from "./addNewFieldModal";
import valueTextInputModal from "./valueTextInputModal";
import valueSelectModal from "./valueSelectModal";
import valueMultiSelectModal from "./valueMultiSelectModal";

export default class fieldSelectModal extends Modal {

    lineNumber: number;
    line: string;
    plugin: MetadataMenu;
    file: TFile;
    inFrontmatter: boolean;
    top: boolean;
    constructor(plugin: MetadataMenu, file: TFile, lineNumber: number, line: string, inFrontmatter: boolean, top: boolean) {
        super(plugin.app);
        this.line = line;
        this.lineNumber = lineNumber;
        this.plugin = plugin;
        this.file = file;
        this.inFrontmatter = inFrontmatter;
        this.top = top;
    };

    onOpen() {
        this.titleEl.setText(`Insert field after > ${this.line.substring(0, 20)}${this.line.length > 20 ? "..." : ""}`);
        const container = this.contentEl.createDiv();
        const settingsDropdownContainer = container.createDiv();
        const settingsSelector = new DropdownComponent(settingsDropdownContainer);
        settingsSelector.addOption("---", "Choose Field");
        settingsSelector.addOption("++New", "New");
        this.plugin.settings.presetFields.forEach(setting => {
            settingsSelector.addOption(setting.name, setting.name);
        });
        settingsSelector.onChange(value => {
            if (value == "++New") {
                const newFieldModal = new addNewFieldModal(this.plugin, this.lineNumber, this.file, this.inFrontmatter, this.top);
                newFieldModal.open();
                this.close();
            } else {
                const field = this.plugin.settings.presetFields.filter(_field => _field.name == value)[0];
                if (field.valuesListNotePath || (field.values && Object.keys(field.values).length > 0)) {
                    if (field.isMulti) {
                        const fieldModal = new valueMultiSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                        fieldModal.titleEl.setText(`Select values for ${value}`);
                        fieldModal.open();
                    } else {
                        const fieldModal = new valueSelectModal(this.app, this.file, field.name, "", field, this.lineNumber, this.inFrontmatter, this.top);
                        fieldModal.titleEl.setText(`Select value for ${value}`);
                        fieldModal.open();
                    };
                } else {
                    const fieldModal = new valueTextInputModal(this.app, this.file, value, "", this.lineNumber, this.inFrontmatter, this.top);
                    fieldModal.titleEl.setText(`Enter value for ${value}`);
                    fieldModal.open();
                };
                this.close();
            };
        });
    };
};