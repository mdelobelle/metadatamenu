import MetadataMenu from "main";
import { ButtonComponent, Setting } from "obsidian";
import { removeFileClassAttributeWithName } from "src/commands/removeFileClassAttribute";
import { FieldTypeTagClass } from "src/types/fieldTypes";
import { FileClass } from "./fileClass";
import { FileClassAttribute } from "./fileClassAttribute";
import { FileClassAttributeModal } from "./FileClassAttributeModal";

class FileClassFieldSetting {
    private plugin: MetadataMenu;

    constructor(
        private container: HTMLElement,
        private fileClass: FileClass,
        public fileClassAttribute: FileClassAttribute,
        plugin: MetadataMenu
    ) {
        this.plugin = plugin;
        this.buildSetting();
    };

    private buildSetting(): void {

        const fieldNameContainer = this.container.createDiv({ cls: "cell" })
        fieldNameContainer.createEl("span", { text: this.fileClassAttribute.name, cls: "title" })
        const typeContainer = this.container.createDiv({ cls: "cell" })
        const chip = typeContainer.createDiv({ cls: `chip ${FieldTypeTagClass[this.fileClassAttribute.type]}` })
        chip.setText(this.fileClassAttribute.type)
        const fieldOptionsContainer = this.container.createDiv({ cls: "cell" })
        fieldOptionsContainer.createEl("span", { cls: "description", text: `${this.fileClassAttribute.getOptionsString(this.plugin)}` })
        this.addEditButton(this.container)
        this.addDeleteButton(this.container);
    };

    private addEditButton(container: HTMLElement): void {
        const btn = new ButtonComponent(container);
        btn.setIcon("pencil")
        btn.setTooltip("Edit")
        btn.setClass("cell")
        btn.onClick(() => {
            let modal = new FileClassAttributeModal(
                this.plugin,
                this.fileClass,
                this.fileClassAttribute
            );
            modal.open();
        })
    };

    private addDeleteButton(container: HTMLElement): void {
        const btn = new ButtonComponent(container);
        btn.setIcon("trash");
        btn.setTooltip("Delete");
        btn.setClass("cell")
        btn.onClick(() => {

            removeFileClassAttributeWithName(this.plugin, this.fileClass, this.fileClassAttribute.name)
        })
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
            const settingContainer = this.container.createDiv({ cls: "setting" })
            new FileClassFieldSetting(settingContainer, this.fileClass, attribute, this.plugin);
        });
    }
}