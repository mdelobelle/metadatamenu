
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

export type BulkEditMode = 'overwrite' | 'append' | 'remove' | 'clear'

const bulkEditModeLabel: Record<BulkEditMode, string> = {
    overwrite: "Overwrite",
    append: "Append to",
    remove: "Remove from",
    clear: "Clear"
}

function parseListValue(value: any): string[] {
    if (!value) return []
    if (Array.isArray(value)) return value.map(v => v.toString().trim()).filter(Boolean)
    return value.toString().split(",").map((v: string) => v.trim()).filter(Boolean)
}

export interface IBaseValueModal<Target> extends Modal {
    managedField: IFieldManager<Target, BaseOptions>
    saved: boolean
}

export interface IBasicModal<T extends Target> extends IBaseValueModal<T> {
    save(): Promise<void>
}

export type ModalType =
    IBasicModal<Target> |
    IListBasedModal<Target> |
    IFileBasedModal<Target> |
    IMediaBasedModal<Target>

export class BaseValueModal<T extends Target, O extends BaseOptions> extends Modal implements IBaseValueModal<T> {
    public managedField: IFieldManager<T, O>
    public saved: boolean = false

    onOpen(): void {
        this.contentEl.setAttr("id", `field_${this.managedField.id}_update_modal`)
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                this.save()
            }
            if (e.key === "Escape" && e.altKey) {
                this.close()
            }
        }
        this.managedField.plugin.app.workspace.trigger("metadata-menu:field-update-modal-built", this)
    }

    async onClose() {
        if (!this.saved) this.managedField.previousModal?.open()
        this.saved = false
    }

    async save() {
        this.saved = true
        this.managedField.save()
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
    }
}



export interface IBasicFuzzySuggestModal<U, T extends Target> extends FuzzySuggestModal<U> {
    managedField: IFieldManager<Target, BaseOptions>
    saved: boolean
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
        public mode: BulkEditMode = 'overwrite'
    ) {
        super(managedField.plugin.app)
        this.containerEl.classList.add("metadata-menu", "confirm-modal")
    }

    private computeFinalValue(target: TargetedField): string {
        const currentValues = parseListValue(target.existingField?.value)
        const newValues = parseListValue(this.managedField.value)
        switch (this.mode) {
            case 'overwrite':
                return this.managedField.value
            case 'append':
                return [...new Set([...currentValues, ...newValues])].join(", ")
            case 'remove':
                return currentValues.filter(v => !newValues.includes(v)).join(", ")
            case 'clear':
                return ""
        }
    }

    async onOpen() {
        const modeLabel = bulkEditModeLabel[this.mode]
        this.titleEl.innerHTML = `${modeLabel} <span class="field-name">${this.managedField.name}</span> values`
        this.contentEl.createEl("hr")
        if (this.mode !== 'clear') {
            const actionLabel = this.mode === 'append' ? "Values to add"
                : this.mode === 'remove' ? "Values to remove"
                : "New value"
            this.contentEl.createEl("span", { text: `${actionLabel}: ` })
            this.contentEl.createEl("span", { cls: "field-value", text: `${this.managedField.value}` })
            this.contentEl.createEl("hr")
        }
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
            const currentValueDisplay = getValueDisplay(target.existingField)
            if (this.mode === 'append' || this.mode === 'remove') {
                const previewValue = this.computeFinalValue(target)
                const currentValueContainer = targetContainer.createDiv({ cls: "current-value" })
                currentValueContainer.createSpan({ text: currentValueDisplay })
                currentValueContainer.createSpan({ text: " → ", cls: "arrow" })
                currentValueContainer.createSpan({ text: previewValue || "<Empty>", cls: previewValue ? "" : "empty-or-missing" })
            } else {
                const currentValueContainer = targetContainer.createDiv({ cls: "current-value", text: currentValueDisplay })
                if (!target.existingField?.value) currentValueContainer.addClass("empty-or-missing")
            }
        }
        const footer = this.contentEl.createDiv({ cls: "footer-container" })
        new ButtonComponent(footer)
            .setButtonText("Confirm")
            .setWarning()
            .onClick(() => {
                for (const target of targets) {
                    const finalValue = this.computeFinalValue(target)
                    postValues(
                        this.managedField.plugin,
                        [{ indexedPath: this.managedField.id, payload: { value: finalValue } }],
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
