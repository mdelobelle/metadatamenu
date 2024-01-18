import { DropdownComponent } from "obsidian"
import { FieldType } from "../BaseField"
import { IManagedField, Target, listBasedModal, isSingleTargeted } from "../Field"
import { ListBase, listBaseSettingsModal, ListBasedOptions } from "../baseFields/ListBasedField"
import { ISettingsModal } from "../BaseSetting";


export type Constructor<T> = new (...args: any[]) => T;

export interface SelectOptions extends ListBasedOptions { }

export function selectSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class SelectSettingsModal extends Base {

    }
}

export class SelectBase extends ListBase {
    type = FieldType.Select
    tagName = "select"
    icon = "arrow"
}
