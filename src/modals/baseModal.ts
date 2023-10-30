import MetadataMenu from "main";
import { ButtonComponent, Modal } from "obsidian"

export default class BaseModal extends Modal {
    constructor(
        public plugin: MetadataMenu
    ) {
        super(plugin.app)
    }
    onOpen(): void {
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter") {
                e.preventDefault()
                if (e.altKey) {
                    await this.save()
                }
            }
        }
    }
    //TODO review navigation
    /*
    Alt+Enter or check button to save and go back or close
    Alt+Shift+Enter to save and force close
    remove cancel button
    Esc to go back or close
    Alt+Esc to force close

    */
    public async save(e?: Event): Promise<void> {
        //to be implemented in subclasses
        throw Error("Subclass should implement a save method")
    }

    public buildSimpleSaveBtn(fieldContainer: HTMLDivElement) {
        fieldContainer.createDiv({ cls: "spacer" })
        const infoContainer = fieldContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const saveBtn = new ButtonComponent(fieldContainer);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(async (e: Event) => {
            await this.save(e);
        })
    }

    public buildFooterBtn() {
        const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        buttonContainer.createDiv({ cls: "spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        //confirm button
        const confirmButton = new ButtonComponent(buttonContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.save();
            this.close()
        })
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        this.modalEl.appendChild(buttonContainer)
    }
}