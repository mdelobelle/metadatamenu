import MetadataMenu from "main";
import { ButtonComponent, Modal, TFile } from "obsidian"
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import { Note } from "src/note/note";
import { FieldManager } from "src/types/fieldTypes";
import ObjectListModal from "../fields/ObjectListModal";
import ObjectModal from "../fields/ObjectModal";

export default class BaseModal extends Modal {

    public saved: boolean = false

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public previousModal?: ObjectModal | ObjectListModal,
        public indexedPath?: string,
    ) {
        super(plugin.app)
    }

    onOpen(): void {
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                await this.save()
            }
            if (e.key === "Escape" && e.altKey) {
                this.close()
            }
        }
    }

    public async save(): Promise<void> {
        //to be implemented in subclasses
        throw Error("Subclass should implement a save method")
    }

    public buildSimpleSaveBtn(fieldContainer: HTMLDivElement) {
        fieldContainer.createDiv({ cls: "spacer" })
        const infoContainer = fieldContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const saveBtn = new ButtonComponent(fieldContainer);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(async () => { await this.save(); })
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

    public async goToPreviousModal() {
        const pM = this.previousModal

        if (pM && this.indexedPath) {
            const upperPath = Field.upperIndexedPathObjectPath(this.indexedPath)
            const { index: upperFieldIndex } = Field.getIdAndIndex(upperPath.split("____").last())
            const eF = await Note.getExistingFieldForIndexedPath(this.plugin, pM.file, pM.indexedPath)
            const pField = pM.eF?.field
            const pFile = pM.file
            const pIndexedPath = pM.indexedPath
            if (upperFieldIndex) {
                pM.close()
                const objectModal = new ObjectModal(this.plugin, this.file, undefined, upperPath,
                    undefined, undefined, undefined, pM.previousModal)
                objectModal.open()
            } else if (pField && pFile) {
                pM.close()
                const fM = new FieldManager[pField.type](this.plugin, pField)
                fM.createAndOpenFieldModal(pFile, pField.name, eF,
                    pIndexedPath, pM.lineNumber, pM.asList, pM.asBlockquote,
                    pM.previousModal)

            } else {
                pM.open()
            }
        }
    }

    async onClose() {
        if (!this.saved) this.previousModal?.open()
        this.saved = false
    }
}