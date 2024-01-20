
import { IFieldManager, Target, fieldValueManager, getIdAndIndex, isSingleTargeted, upperIndexedPathObjectPath } from "../Field"
import MetadataMenu from "main"
import { ButtonComponent, Modal, TFile, setIcon } from "obsidian"
import { IListBasedModal } from "../models/baseModels/ListBasedField";
import { getExistingFieldForIndexedPath, getValuesForIndexedPath } from "src/commands/getValues";
import { postValues } from "src/commands/postValues";
import { Constructor } from "src/typings/types";
import { Note } from "src/note/note";
import ObjectModal from "src/modals/fields/ObjectModal";
import { ExistingField, getValueDisplay } from "../ExistingField";
import { positionIcon } from "src/note/line";

export interface IBaseValueModal<T extends Target> extends Modal {
    managedField: IFieldManager<T>
    previousModal?: IBaseValueModal<T> //TODO replace w/ ObjectModal | ObjectListModal
    saved: boolean
}

export interface IBasicModal<T extends Target> extends IBaseValueModal<T> { }

export type ModalType =
    IBasicModal<Target> |
    IListBasedModal<Target>

export class BaseValueModal<T extends Target> extends Modal implements BaseValueModal<T> {
    public managedField: IFieldManager<T>
    public previousModal?: BaseValueModal<T> //TODO replace w/ ObjectModal | ObjectListModal
    public saved: boolean = false
    onOpen(): void {
        this.containerEl.onkeydown = (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                this.managedField.save()
                this.close()
            }
            if (e.key === "Escape" && e.altKey) {
                this.close()
            }
        }
    }

    public async goToPreviousModal() {
        const pM = this.previousModal

        if (pM && this.managedField.indexedPath && isSingleTargeted(pM.managedField)) {
            const upperPath = upperIndexedPathObjectPath(this.managedField.indexedPath)
            const { index: upperFieldIndex } = getIdAndIndex(upperPath.split("____").last())
            const eF = await Note.getExistingFieldForIndexedPath(this.managedField.plugin, pM.managedField.target, pM.managedField.indexedPath)
            const pField = pM.managedField.eF?.field
            const pFile = pM.managedField.target
            const pIndexedPath = pM.managedField.indexedPath
            if (upperFieldIndex && isSingleTargeted(this.managedField)) {
                pM.close()
                const objectModal = new ObjectModal(this.managedField.plugin, this.managedField.target, undefined, upperPath,
                    undefined, undefined, undefined, pM.managedField.previousModal)
                objectModal.open()
            } else if (pField && pFile) {
                pM.close()
                fieldValueManager(
                    this.managedField.plugin,
                    pField.id,
                    pField.fileClassName,
                    pFile,
                    eF,
                    pIndexedPath,
                    pM.managedField.lineNumber,
                    pM.managedField.asList,
                    pM.managedField.asBlockquote,
                    pM.managedField.previousModal
                )?.openModal()
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

export function basicModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    return class BasicValueModal extends BaseValueModal<Target> {
        public managedField: IFieldManager<Target>
        public previousModal: BaseValueModal<Target> | undefined
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(this.managedField.name)
        }
    }
}

interface TargetedField {
    filePath: string,
    fileName: string,
    existingField: ExistingField | undefined
}


export class MultiTargetModificationConfirmModal extends Modal {
    constructor(
        public managedField: IFieldManager<TFile[]>,
    ) {
        super(managedField.plugin.app)
        this.containerEl.classList.add("metadata-menu", "confirm-modal")
    }

    async onOpen() {
        this.titleEl.innerHTML = `Change <span class="field-name">${this.managedField.name}</span> current values`
        this.contentEl.createEl("hr")
        this.contentEl.createEl("span", { text: "New value: " })
        this.contentEl.createEl("span", { cls: "field-value", text: `${this.managedField.value}` })
        this.contentEl.createEl("hr")
        this.contentEl.createDiv({ text: `Target file(s) (${this.managedField.target.length}):` })
        const targetsContainer = this.contentEl.createDiv()
        const targets: TargetedField[] = []
        for (const file of this.managedField.target) {
            const eF = await getExistingFieldForIndexedPath(this.managedField.plugin, file, this.managedField.indexedPath || this.managedField.id)
            targets.push({
                filePath: file.path,
                fileName: file.basename,
                existingField: eF
            })
        }
        for (const target of targets) {
            const targetContainer = targetsContainer.createDiv({ cls: "target-container" })
            const locationContainer = targetContainer.createDiv({ cls: "location-container" })
            locationContainer.createSpan({ cls: "file-name", text: target.fileName })
            const positionIconContainer = locationContainer.createSpan({ cls: "position-icon", text: target.fileName })
            if (target.existingField) {
                const position = target.existingField.position
                setIcon(positionIconContainer, positionIcon[position])

                positionIconContainer.ariaLabel = `${this.managedField.name} current section: ${position}`
            } else {
                setIcon(positionIconContainer, "circle-slash")
                positionIconContainer.ariaLabel = `${this.managedField.name} hasn't been found in this file`
            }
            const lineNumber = target.existingField?.lineNumber
            const lineNumberDisplay = locationContainer.createSpan({ cls: "line-number", text: lineNumber ? `(${lineNumber})` : "" })
            if (lineNumber) lineNumberDisplay.ariaLabel = `${this.managedField.name} current line: ${lineNumber}`
            const currentValueContainer = targetContainer.createDiv({ cls: "current-value", text: getValueDisplay(target.existingField) })
            if (!target.existingField?.value) currentValueContainer.addClass("empty-or-missing")
        }
        const footer = this.contentEl.createDiv({ cls: "footer-container" })
        new ButtonComponent(footer)
            .setButtonText("Confirm")
            .setWarning()
            .onClick(() => {
                for (const target of targets) {
                    postValues(
                        this.managedField.plugin,
                        [{ indexedPath: this.managedField.id, payload: { value: this.managedField.value } }],
                        target.filePath,
                        this.managedField.lineNumber || -1,
                        this.managedField.asList,
                        this.managedField.asBlockquote
                    )
                }
                this.close()
            })
    }
}
