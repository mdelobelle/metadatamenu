import { FieldBase, FieldType, Options } from "../BaseField"
import { ISettingsModal } from "../BaseSetting"
import { IManagedField, Target, basicModal } from "../Field"
import { Constructor } from "../Fields"

export interface ObjectListOptions extends Options {

}

export function objectListSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class ObjectListSettingsModal extends Base {

    }
}

export class ObjectListBase extends FieldBase {
    type = FieldType.ObjectList
    tagName = "object-list"
    icon = "boxes"
}