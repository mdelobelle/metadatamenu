import MetadataMenu from "main";
import { ButtonComponent, setIcon, Setting } from "obsidian";
import { removeFileClassAttributeWithId } from "src/commands/removeFileClassAttribute";
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
    //FIXME grand child ot below the correct parent
    private buildSetting(): void {
        const fCA = this.fileClassAttribute
        const fieldNameContainer = this.container.createDiv({ cls: "name-container" })
        const level = !fCA.path ? 0 : fCA.path.split("____").length
        for (let i = 0; i < level; i++) {
            const indentation = fieldNameContainer.createDiv({ cls: "indentation" })
            if (i === level - 1) { setIcon(indentation, "corner-down-right") }
        }
        fieldNameContainer.createEl("span", { text: fCA.name, cls: "title" })
        const typeContainer = this.container.createDiv({ cls: "type-container" })
        const chip = typeContainer.createDiv({ cls: `chip ${FieldTypeTagClass[fCA.type]}` })
        chip.setText(fCA.type)
        const fieldButtonsContainer = this.container.createDiv({ cls: "buttons-container" })
        this.addEditButton(fieldButtonsContainer)
        this.addDeleteButton(fieldButtonsContainer);
        const fieldOptionsContainer = this.container.createDiv({ cls: "options-container" })
        fieldOptionsContainer.createEl("span", { cls: "description", text: `${fCA.getOptionsString(this.plugin)}` })
    };

    private addEditButton(container: HTMLElement): void {
        const btn = new ButtonComponent(container);
        btn.setIcon("pencil")
        btn.setTooltip("Edit")
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

            removeFileClassAttributeWithId(this.plugin, this.fileClass, this.fileClassAttribute.id)
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
        this.container = this.viewContainer.createDiv({ cls: "fv-fields" })
        this.buildSettings();
    };

    private builAddBtn(): void {
        const footer = this.container.createDiv({ cls: "footer" });
        const btnContainer = footer.createDiv({ cls: "cell" })
        const addBtn = btnContainer.createEl('button');
        setIcon(addBtn, "list-plus")
        addBtn.onclick = async () => {
            const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, FileClass.createFileClass(this.plugin, this.fileClass.name))
            fileClassAttributeModal.open()
        }
    }

    buildSettings(): void {
        this.container.replaceChildren();
        const fieldsContainer = this.container.createDiv({ cls: "fields-container" })
        const attributes = FileClass.getFileClassAttributes(this.plugin, this.fileClass);
        const sortedAttributes = attributes.filter(attr => !attr.path)
        while (sortedAttributes.length < attributes.length) {
            const _initial = [...sortedAttributes]
            sortedAttributes.forEach((sAttr, parentIndex) => {
                for (const attr of attributes) {
                    if (
                        attr.path?.split("____").last() === sAttr.id &&
                        !sortedAttributes.includes(attr)
                    ) {
                        //insert before next field at same or lower level as parent
                        const parentLevel = sAttr.getLevel()
                        const parentSibling = sortedAttributes.slice(parentIndex + 1).find(oAttr => oAttr.getLevel() <= parentLevel)
                        const parentSiblingIndex = parentSibling ? sortedAttributes.indexOf(parentSibling) : sortedAttributes.length
                        sortedAttributes.splice(parentSiblingIndex, 0, attr)
                        break
                    }
                }
            })
            if (_initial.length === sortedAttributes.length) {
                throw Error("Impossible to restore field hierarchy, check you fileclass configuration")
            }
        }
        sortedAttributes.forEach(attribute => {
            new FileClassFieldSetting(fieldsContainer, this.fileClass, attribute, this.plugin);
        });
        this.builAddBtn();
    }
}