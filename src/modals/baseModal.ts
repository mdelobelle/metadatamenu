import MetadataMenu from "main";
import { ButtonComponent, Modal, TFile } from "obsidian"
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import { FieldManager } from "src/types/fieldTypes";
import ObjectListModal from "./fields/ObjectListModal";
import ObjectModal from "./fields/ObjectModal";

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

    public async goToPreviousModal() {
        await ExistingField.indexFieldsValues(this.plugin)
        const pM = this.previousModal


        if (pM && this.indexedPath) {
            const upperPath = Field.upperIndexedPathObjectPath(this.indexedPath)
            const { index: upperFieldIndex } = Field.getIdAndIndex(upperPath.split("____").last())

            const eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(this.plugin, pM.file, pM.indexedPath)

            const pField = pM.eF?.field
            const pFile = pM.file
            const pIndexedPath = pM.indexedPath
            if (upperFieldIndex) {
                pM.close()
                const existingFields = (await ExistingField.getExistingFieldsFromIndexForFilePath(this.plugin, this.file))
                    .filter(eF => eF.indexedPath && Field.upperPath(eF.indexedPath) === upperPath) || []
                const { id } = Field.getIdAndIndex(upperPath?.split("____").last())
                const missingFields = this.plugin.fieldIndex.filesFields
                    .get(this.file.path)?.filter(_f => _f.getFirstAncestor()?.id === id)
                    .filter(_f => !existingFields.map(eF => eF.field.id).includes(_f.id)) || []
                const objectModal = new ObjectModal(this.plugin, this.file, undefined, upperPath,
                    undefined, undefined, undefined, pM.previousModal, existingFields, missingFields)
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