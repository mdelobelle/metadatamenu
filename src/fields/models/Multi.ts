import { FieldType } from "../BaseField"
import { ISettingsModal } from "../BaseSetting"
import { ListBase, ListBasedOptions } from "../baseFields/ListBasedField"
import { IManagedField, Target, listBasedModal } from "../Field"
import { Constructor } from "../Fields"

export interface MultiOptions extends ListBasedOptions { }

export function multiSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class SelectSettingsModal extends Base {

    }
}


export class MultiBase extends ListBase {
    type = FieldType.Multi
    tagName = "multi"
    icon = "list"
}