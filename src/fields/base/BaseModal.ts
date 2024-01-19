
import { IFieldManager, Target } from "../Field"
import MetadataMenu from "main"
import { ButtonComponent, Modal, TFile } from "obsidian"
import { IListBasedModal } from "../models/baseModels/ListBasedField";
import { getValuesForIndexedPath } from "src/commands/getValues";
import { postValues } from "src/commands/postValues";

type Constructor<T> = new (...args: any[]) => T;

export interface IBaseValueModal<T extends Target> extends Omit<Modal, 'close'> {
    managedField: IFieldManager<T>
    previousModal?: Modal //TODO replace w/ ObjectModal | ObjectListModal
    close: (openPreviousModal: boolean) => void
}

export interface IBasicModal<T extends Target> extends IBaseValueModal<T> { }

export type ModalType =
    IBasicModal<Target> |
    IListBasedModal<Target>

export function basicModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    return class BaseValueModal extends Modal {
        public managedField: IFieldManager<Target>
        public previousModal: Modal | undefined
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(this.managedField.name)
        }
        save() { managedField.save() }
    }
}

interface TargetValue {
    filePath: string,
    fileName: string,
    value: any
}


export class MultiTargetModificationConfirmModal extends Modal {
    constructor(
        public managedField: IFieldManager<TFile[]>,
    ) {
        super(managedField.plugin.app)
    }

    async onOpen() {
        this.titleEl.setText("Confirm modification")
        this.contentEl.createDiv({ text: `${this.managedField.name} will be updated with "${this.managedField.value}" in the following ${this.managedField.target.length} files:` })
        const targets = this.contentEl.createDiv()
        const targetsList = targets.createEl("ul")
        const targetValues: TargetValue[] = []
        for (const file of this.managedField.target) {
            const currentValue = await getValuesForIndexedPath(this.managedField.plugin, file, this.managedField.indexedPath || this.managedField.id)
            targetValues.push({
                filePath: file.path,
                fileName: file.basename,
                value: currentValue || ""
            })
        }
        for (const value of targetValues) {
            targetsList.createEl("li", { title: value.fileName, text: `${value.filePath}: $(${value.value ?? "--missing--"}) -> ${this.managedField.value}` })
        }
        const footer = this.contentEl.createDiv({ cls: "footer-container" })
        new ButtonComponent(footer)
            .setButtonText("Confirm")
            .setWarning()
            .onClick(() => {
                for (const value of targetValues) {
                    postValues(
                        this.managedField.plugin,
                        [{ indexedPath: this.managedField.id, payload: { value: this.managedField.value } }],
                        value.filePath,
                        this.managedField.lineNumber,
                        this.managedField.asList,
                        this.managedField.asBlockquote
                    )
                }
                this.close()
            })
    }
}
