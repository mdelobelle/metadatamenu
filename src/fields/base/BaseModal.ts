
import { IFieldManager, Target, fieldValueManager, getIdAndIndex, isSingleTargeted, upperIndexedPathObjectPath } from "../Field"
import MetadataMenu from "main"
import { ButtonComponent, FuzzySuggestModal, Modal, SuggestModal, TFile, setIcon } from "obsidian"
import { Modal as IListBasedModal } from "../models/abstractModels/AbstractList";
import { Modal as IFileBasedModal } from "../models/abstractModels/AbstractFile";
import { Modal as IMediaBasedModal } from "../models/abstractModels/AbstractMedia";
import { getExistingFieldForIndexedPath } from "src/commands/getValues";
import { postValues } from "src/commands/postValues";
import { Constructor } from "src/typings/types";
import { Note } from "src/note/note";
import { ExistingField, getValueDisplay } from "../ExistingField";
import { positionIcon } from "src/note/line";
import { BaseOptions } from "./BaseField";

export interface IBaseValueModal<Target> extends Modal {
    managedField: IFieldManager<Target, BaseOptions>
    saved: boolean
    goToPreviousModal: () => void | Promise<void>
    buildSimpleSaveBtn: (fieldContainer: HTMLDivElement) => void
}

export interface IBasicModal<T extends Target> extends IBaseValueModal<T> { }

export type ModalType =
    IBasicModal<Target> |
    IListBasedModal<Target> |
    IFileBasedModal<Target> |
    IMediaBasedModal<Target>

export class BaseValueModal<T extends Target, O extends BaseOptions> extends Modal implements IBaseValueModal<T> {
    public managedField: IFieldManager<T, O>
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
        const pM = this.managedField.previousModal
        if (pM && this.managedField.indexedPath && isSingleTargeted(pM.managedField)) {
            const upperPath = upperIndexedPathObjectPath(this.managedField.indexedPath)
            const { index: upperFieldIndex } = getIdAndIndex(upperPath.split("____").last())
            const eF = await Note.getExistingFieldForIndexedPath(this.managedField.plugin, pM.managedField.target, pM.managedField.indexedPath)
            const pField = pM.managedField.eF?.field
            const pFile = pM.managedField.target
            const pIndexedPath = pM.managedField.indexedPath
            if (upperFieldIndex && isSingleTargeted(this.managedField)) {
                pM.close()
                const uEF = await Note.getExistingFieldForIndexedPath(this.managedField.plugin, this.managedField.target, upperPath)
                if (uEF) fieldValueManager(this.managedField.plugin, uEF.field.id, uEF.field.fileClassName, this.managedField.target, uEF, uEF.indexedPath)?.openModal()
                // jardinerie ultime.... à tester
                // const objectModal = new ObjectModal(this.managedField.plugin, this.managedField.target, undefined, upperPath,
                //     undefined, undefined, undefined, pM.previousModal)
                // objectModal.open()
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

    public buildSimpleSaveBtn(fieldContainer: HTMLDivElement) {
        fieldContainer.createDiv({ cls: "spacer" })
        const infoContainer = fieldContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const saveBtn = new ButtonComponent(fieldContainer);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(() => {
            this.managedField.save();
        })
    }

    async onClose() {
        if (!this.saved) this.managedField.previousModal?.open()
        this.saved = false
    }

}

export function basicModal<O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    return class BasicValueModal extends BaseValueModal<Target, O> {
        public managedField: IFieldManager<Target, O>
        public previousModal: BaseValueModal<Target, O> | undefined
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(this.managedField.name)
        }
    }
}

export interface IBasicSuggestModal<U, T extends Target> extends SuggestModal<U> {
    managedField: IFieldManager<Target, BaseOptions>
    saved: boolean
    goToPreviousModal: () => void | Promise<void>
    buildSimpleSaveBtn: (fieldContainer: HTMLDivElement) => void
}

export function basicSuggestModal<U, O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): Constructor<IBasicSuggestModal<U, Target>> {
    return class BasicValueSuggestModal extends SuggestModal<U> {
        getSuggestions(query: string): U[] | Promise<U[]> {
            throw new Error("Method not implemented.");
        }
        renderSuggestion(value: U, el: HTMLElement) {
            throw new Error("Method not implemented.");
        }
        onChooseSuggestion(item: U, evt: KeyboardEvent | MouseEvent) {
            throw new Error("Method not implemented.");
        }
        public saved: boolean
        public managedField: IFieldManager<Target, O>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
        }
        goToPreviousModal() { }
        buildSimpleSaveBtn(fieldContainer: HTMLDivElement) { }
    }
}



export interface IBasicFuzzySuggestModal<U, T extends Target> extends FuzzySuggestModal<U> {
    managedField: IFieldManager<Target, BaseOptions>
    saved: boolean
    goToPreviousModal: () => void | Promise<void>
    buildSimpleSaveBtn: (fieldContainer: HTMLDivElement) => void
}

export function basicFuzzySuggestModal<U, O extends BaseOptions>(managedField: IFieldManager<Target, O>, plugin: MetadataMenu): Constructor<IBasicFuzzySuggestModal<U, Target>> {
    return class BasicValueSuggestModal extends FuzzySuggestModal<U> {
        getItems(): U[] {
            throw new Error("Method not implemented.");
        }
        getItemText(item: U): string {
            throw new Error("Method not implemented.");
        }
        onChooseItem(item: U, evt: KeyboardEvent | MouseEvent): void {
            throw new Error("Method not implemented.");
        }
        public saved: boolean
        public managedField: IFieldManager<Target, O>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
        }
        goToPreviousModal() { }
        buildSimpleSaveBtn(fieldContainer: HTMLDivElement) { }
    }
}

interface TargetedField {
    filePath: string,
    fileName: string,
    existingField: ExistingField | undefined
}


export class MultiTargetModificationConfirmModal<O extends BaseOptions> extends Modal {
    constructor(
        public managedField: IFieldManager<TFile[], O>,
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
