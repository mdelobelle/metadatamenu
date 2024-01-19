
import { IFieldManager, Target, fieldValueManager, getFieldConstructor } from "../Field"
import MetadataMenu from "main"
import { Modal, TFile } from "obsidian"
import { ExistingField } from "../ExistingField";
import { IListBasedModal } from "../models/baseModels/ListBasedField";
import { getValuesForIndexedPath } from "src/commands/getValues";

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

export function openModal(id: string, fileClassName: string | undefined, existingField: ExistingField | undefined, target: Target, plugin: MetadataMenu) {
    const fieldVM = fieldValueManager(id, fileClassName, target, existingField, plugin)
    fieldVM?.openModal()
}

interface TargetValue {
    filePath: string,
    fileName: string,
    value: any
}


class MultiTargetModificationConfirmModal extends Modal {
    constructor(
        public managedField: IFieldManager<TFile[]>,
        public plugin: MetadataMenu
    ) {
        super(plugin.app)
        this.build()
    }

    async onOpen() {
        const values: TargetValue[] = []
        for (const file of this.managedField.target) {
            const currentValue = await getValuesForIndexedPath(this.plugin, file, this.managedField.indexedPath || this.managedField.id)
            values.push({
                filePath: file.path,
                fileName: file.basename,
                value: currentValue || ""
            })
        }
    }

    build() {
        this.titleEl.setText("Confirm modification")
    }
}