import MetadataMenu from "main";
import { ButtonComponent, Modal, TextComponent, ToggleComponent } from "obsidian";
import { createFileClass } from "src/commands/createFileClass";


export default class AddNewFileClassModal extends Modal {

    constructor(
        private plugin: MetadataMenu,
    ) {
        super(plugin.app);
    }

    onOpen(): void {
        this.titleEl.setText("Add a new fileClass");
        this.buildAddFileClassForm();
    }

    buildAddFileClassForm(): void {
        const fileClassesPath = this.plugin.settings.classFilesPath!
        const fileClassAlias = this.plugin.settings.fileClassAlias
        const nameContainer = this.contentEl.createDiv({});

        const nameInputContainer = nameContainer.createDiv({ cls: "metadata-menu-input" });
        nameInputContainer.createDiv({ text: `${fileClassAlias} name` })
        const nameInput = new TextComponent(nameInputContainer);
        const nameErrorContainer = nameContainer.createDiv({ cls: "metadata-menu-modal-value-error-field", text: `This ${fileClassAlias} file already exists` });

        const mapWithTagToggleContainer = this.contentEl.createDiv({ cls: "metadata-menu-toggler-with-label" });
        mapWithTagToggleContainer.createDiv({ cls: "metadata-menu-toggler-label", text: `Map this ${fileClassAlias} file with the tag of same name` })
        const mapWithTagToggler = new ToggleComponent(mapWithTagToggleContainer)
        mapWithTagToggler.setValue(false);

        const actionsContainer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        //actionsContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" }) // spacer
        const saveBtnContainer = actionsContainer.createDiv({});
        const saveBtn = new ButtonComponent(saveBtnContainer);
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
        });
        saveBtn.onClick(() => {
            createFileClass(this.plugin, nameInput.getValue(), mapWithTagToggler.getValue());
            this.close();
        })
    }
}