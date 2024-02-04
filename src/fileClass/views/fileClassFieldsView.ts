import MetadataMenu from "main";
import { ButtonComponent, FrontMatterCache, Modal, setIcon } from "obsidian";
import { removeFileClassAttributeWithId } from "src/commands/removeFileClassAttribute";
import { FileClass, buildSortedAttributes } from "../fileClass";
import { FileClassAttribute } from "../fileClassAttribute";
import { openSettings } from "src/fields/base/BaseSetting";
import { getTagName } from "src/fields/Fields";
import { FileClassView, openTab } from "./fileClassView";
import { enterFieldSettings } from "src/tests/test";
import { buildEmptyField, buildField } from "src/fields/Field";

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
        const fCA = this.fileClassAttribute
        const fieldNameContainer = this.container.createDiv({ cls: "name-container" })
        const level = !fCA.path ? 0 : fCA.path.split("____").length
        for (let i = 0; i < level; i++) {
            const indentation = fieldNameContainer.createDiv({ cls: "indentation" })
            if (i === level - 1) { setIcon(indentation, "corner-down-right") }
        }
        fieldNameContainer.createEl("span", { text: fCA.name, cls: "title" })
        const typeContainer = this.container.createDiv({ cls: "type-container" })
        const chip = typeContainer.createDiv({ cls: `chip ${getTagName(fCA.type)}` })
        chip.setText(fCA.type)
        const fieldButtonsContainer = this.container.createDiv({ cls: "buttons-container" })
        this.addEditButton(fieldButtonsContainer)
        this.addDeleteButton(fieldButtonsContainer);
        this.addMoveBtn(fieldButtonsContainer, "asc", this.fileClassAttribute.id)
        this.addMoveBtn(fieldButtonsContainer, "desc", this.fileClassAttribute.id)
        const fieldOptionsContainer = this.container.createDiv({ cls: "options-container" })
        fieldOptionsContainer.createEl("span", { cls: "description", text: `${fCA.getOptionsString(this.plugin)}` })
    };

    private addEditButton(container: HTMLElement): void {
        const btn = new ButtonComponent(container);
        btn.setIcon("pencil")
        btn.setTooltip("Edit")
        btn.onClick(() => openSettings(this.fileClassAttribute.id, this.fileClass.name, this.plugin))
    };

    private addDeleteButton(container: HTMLElement): void {
        const btn = new ButtonComponent(container);
        btn.setIcon("trash");
        btn.setTooltip("Delete");
        btn.setClass("cell")
        btn.onClick(() => {
            const confirmModal = new Modal(this.plugin.app);
            confirmModal.containerEl.addClass("metadata-menu");
            confirmModal.titleEl.setText("Please confirm");
            confirmModal.contentEl.createDiv().setText(`Do you really want to remove this field?`);
            const confirmFooter = confirmModal.contentEl.createDiv({ cls: "footer-actions" });
            confirmFooter.createDiv({ cls: "spacer" })
            const confirmButton = new ButtonComponent(confirmFooter);
            confirmButton.setWarning();
            confirmButton.setIcon("checkmark");
            confirmButton.onClick(async () => {
                removeFileClassAttributeWithId(this.plugin, this.fileClass, this.fileClassAttribute.id)
                confirmModal.close();
            })
            const dismissButton = new ButtonComponent(confirmFooter);
            dismissButton.setIcon("cross");
            dismissButton.onClick(() => confirmModal.close());
            confirmModal.open();

        })
    };

    private addMoveBtn(container: HTMLElement, dir: "asc" | "desc", id: string) {
        const btn = new ButtonComponent(container);
        btn.setIcon(dir === "asc" ? "chevron-up" : "chevron-down");
        btn.setTooltip(dir === "asc" ? "Move up" : "Move down");
        btn.setClass("cell")
        btn.onClick(() => {
            this.fileClass.moveField(id, dir === "asc" ? "upwards" : "downwards")
        })
    }
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
            openSettings("", this.fileClass.name, this.plugin)
        }
    }

    buildSettings(): void {
        this.container.replaceChildren();
        const fieldsContainer = this.container.createDiv({ cls: "fields-container" })
        const sortedAttributes = buildSortedAttributes(this.plugin, this.fileClass)
        sortedAttributes.forEach(attribute => {
            new FileClassFieldSetting(fieldsContainer, this.fileClass, attribute, this.plugin);
        });
        this.builAddBtn();
    }
}


export async function testFileClassFieldsView(plugin: MetadataMenu, fileClass: FileClass, data: FrontMatterCache, speed: number = 100) {
    const fCView = plugin.app.workspace.getActiveViewOfType(FileClassView)
    if (!fCView || !fCView.fieldsView) throw Error(`${fileClass.name} view didn't open`)
    openTab(fCView, "fields", speed)
    for (const fieldData of data.fields) {
        const field = new (buildEmptyField(plugin, fileClass.name))
        Object.assign(field, fieldData)
        await enterFieldSettings(field, undefined, fileClass)
    }
}

