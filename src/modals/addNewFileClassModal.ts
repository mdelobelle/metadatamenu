import MetadataMenu from "main";
import { ButtonComponent, Modal, TextComponent, ToggleComponent } from "obsidian";
import { createFileClass } from "src/commands/createFileClass";
import { cleanActions } from "src/utils/modals";


export default class AddNewFileClassModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
    }

    onOpen(): void {
        this.titleEl.setText("Add a new fileClass");
        this.buildAddFileClassForm();
    }

    buildAddFileClassForm(): void {
        const fileClassesPath = this.plugin.settings.classFilesPath!
        const fileClassAlias = this.plugin.settings.fileClassAlias
        const nameContainer = this.contentEl.createDiv({ cls: "field-container" });

        nameContainer.createDiv({ text: `${fileClassAlias} name`, cls: "label" })
        const nameInput = new TextComponent(nameContainer);
        nameInput.inputEl.addClass("with-label");
        nameInput.inputEl.addClass("full-width");
        const nameErrorContainer = this.contentEl.createDiv({ cls: "field-error", text: `This ${fileClassAlias} file already exists` });

        const mapWithTagContainer = this.contentEl.createDiv({ cls: "field-container" });
        mapWithTagContainer.createDiv({ cls: "label", text: `Map this ${fileClassAlias} file with the tag of same name` });
        mapWithTagContainer.createDiv({ cls: "spacer" });
        const mapWithTagToggler = new ToggleComponent(mapWithTagContainer)
        mapWithTagToggler.setValue(false);
        mapWithTagToggler.onChange(value => {
            if (value) { tagNamesContainer.show(); } else { tagNamesContainer.hide(); }
        })

        const tagNamesContainer = this.contentEl.createDiv({ cls: "field-container" });
        tagNamesContainer.createDiv({ cls: "label", text: "Aliases (optional)" });
        const tagNamesInput = new TextComponent(tagNamesContainer);
        tagNamesInput.inputEl.addClass("with-label");
        tagNamesInput.inputEl.addClass("full-width");
        tagNamesInput.setPlaceholder("Leave empty to map with the tag of same name as fileclass")
        tagNamesContainer.hide();
        cleanActions(this.contentEl, ".footer-actions")
        const actionsContainer = this.contentEl.createDiv({ cls: "footer-actions" });
        actionsContainer.createDiv({ cls: "spacer" })
        const saveBtn = new ButtonComponent(actionsContainer);
        saveBtn.setDisabled(true);
        saveBtn.setIcon("file-plus-2");

        nameErrorContainer.hide();
        nameInput.onChange(async value => {
            nameErrorContainer.hide();
            saveBtn.setDisabled(false)
            saveBtn.setCta()
            if (await this.plugin.app.vault.adapter.exists(`${fileClassesPath}${value}.md`)) {
                nameErrorContainer.show();
                saveBtn.setDisabled(true)
                saveBtn.removeCta()
            }
            else {
                saveBtn.setDisabled(false);
                saveBtn.setCta();
            }
        });
        saveBtn.onClick(() => {
            createFileClass(
                this.plugin,
                nameInput.getValue(),
                mapWithTagToggler.getValue(),
                tagNamesInput.getValue().split(",").map(t => t.trim())
            );
            this.close();
        })
    }
}