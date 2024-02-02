import MetadataMenu from "main";
import { ButtonComponent, Modal, Notice, TextComponent, TFile, ToggleComponent } from "obsidian";
import { cleanActions } from "src/utils/modals";


export default class AddNewFileClassModal extends Modal {
    name: string
    constructor(
        private plugin: MetadataMenu,
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
        this.containerEl.setAttr("id", "add-new-fileclass-modal")
    }

    onOpen(): void {
        this.titleEl.setText("Add a new fileClass");
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                await this.save()
            }
            if (e.key === "Escape" && e.altKey) {
                this.close()
            }
        }
        this.buildAddFileClassForm();
    }

    private buildAddFileClassForm(): void {
        const fileClassesPath = this.plugin.settings.classFilesPath!
        const fileClassAlias = this.plugin.settings.fileClassAlias
        const nameContainer = this.contentEl.createDiv({ cls: "field-container" });

        nameContainer.createDiv({ text: `${fileClassAlias} name`, cls: "label" })
        const nameInput = new TextComponent(nameContainer);
        nameInput.inputEl.addClass("with-label");
        nameInput.inputEl.addClass("full-width");
        nameInput.inputEl.setAttr("id", "fileclass-name-input")
        const nameErrorContainer = this.contentEl.createDiv({ cls: "field-error", text: `This ${fileClassAlias} file already exists` });

        cleanActions(this.contentEl, ".footer-actions")
        const actionsContainer = this.contentEl.createDiv({ cls: "footer-actions" });
        actionsContainer.createDiv({ cls: "spacer" })
        const infoContainer = actionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const saveBtn = new ButtonComponent(actionsContainer)
            .setDisabled(true)
            .setIcon("file-plus-2")
        saveBtn.buttonEl.setAttr("id", "new-fileclass-confirm-btn")
        nameErrorContainer.hide();
        nameInput.onChange(async value => {
            this.name = nameInput.getValue()
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
        saveBtn.onClick(async () => await this.save())
    }



    private async save() {
        const fileClassName = this.name
        const classFilesPath = this.plugin.settings.classFilesPath
        let fCFile: TFile
        const openAfterCreate = this.plugin.fieldIndex.openFileClassManagerAfterIndex
        if (classFilesPath) {
            try {
                openAfterCreate.push(fileClassName)
                fCFile = await this.plugin.app.vault.create(`${classFilesPath}${fileClassName}.md`, "")
            } catch (error) {
                openAfterCreate.remove(fileClassName)
                new Notice("Something went wrong. Impossible to create this fileClass", 3000)
                return
            }
        }
        this.close();
    }
}