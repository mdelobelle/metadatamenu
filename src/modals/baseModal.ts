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
                await this.save();
                this.close()
            }
        }
    }

    public async save(e?: Event): Promise<void> {
        //to be implemented in subclasses
        throw Error("Subclass should implement a save method")
    }

    public buildSaveBtn(fieldContainer: HTMLDivElement) {
        fieldContainer.createDiv({ cls: "spacer" })
        const saveBtn = new ButtonComponent(fieldContainer);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(async (e: Event) => {
            await this.save(e);
        })
    }
}