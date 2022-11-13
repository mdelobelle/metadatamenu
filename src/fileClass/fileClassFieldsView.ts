import MetadataMenu from "main";
import { Setting } from "obsidian";
import { removeFileClassAttributeWithName } from "src/commands/removeFileClassAttribute";
import { FieldTypeTagClass } from "src/types/fieldTypes";
import { FileClass } from "./fileClass";
import { FileClassAttribute } from "./fileClassAttribute";
import { FileClassAttributeModal } from "./FileClassAttributeModal";

class FileClassFieldSetting extends Setting {
    private fieldNameContainer: HTMLSpanElement;
    private typeContainer: HTMLSpanElement;
    private fieldOptionsContainer: HTMLSpanElement;
    private plugin: MetadataMenu;

    constructor(
        private containerEl: HTMLElement,
        private fileClass: FileClass,
        public fileClassAttribute: FileClassAttribute,
        plugin: MetadataMenu
    ) {
        super(containerEl);
        this.plugin = plugin;
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();
        this.settingEl.addClass("no-border")
    };

    public setTextContentWithname(): void {

        this.infoEl.textContent = "";
        this.infoEl.addClass("setting-item")
        this.fieldNameContainer = this.infoEl.createEl("div", "name")
        this.fieldNameContainer.setText(this.fileClassAttribute.name)
        this.typeContainer = this.infoEl.createEl("div")
        this.typeContainer.setAttr("class", `chip ${FieldTypeTagClass[this.fileClassAttribute.type]}`)
        this.typeContainer.setText(this.fileClassAttribute.type)
        this.fieldOptionsContainer = this.infoEl.createEl("div")
        this.fieldOptionsContainer.setText(`${this.fileClassAttribute.getOptionsString(this.plugin)}`)
    };

    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FileClassAttributeModal(
                        this.plugin,
                        this.fileClass,
                        this.fileClassAttribute
                    );
                    modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    removeFileClassAttributeWithName(this.plugin, this.fileClass, this.fileClassAttribute.name)
                });
        });
    };
}

export class FileClassFieldsView {
    private plugin: MetadataMenu;
    public container: HTMLDivElement

    constructor(
        plugin: MetadataMenu,
        private viewContainer: HTMLDivElement,
        private fileClass: FileClass
    ) {
        this.plugin = plugin;
        this.container = this.viewContainer.createDiv({ cls: "fv-settings" })
        this.buildSettings();
    };

    buildSettings(): void {
        this.container.replaceChildren();
        const attributes = FileClass.getFileClassAttributes(this.plugin, this.fileClass);
        attributes.forEach(attribute => {
            new FileClassFieldSetting(this.container, this.fileClass, attribute, this.plugin);
        });
    }
}