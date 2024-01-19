import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import { Constructor, FieldType } from "../Fields"

export interface Options extends BaseOptions {

}

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class ObjectListSettingsModal extends Base {

    }
}

export class Base implements IFieldBase {
    type = FieldType.ObjectList
    tagName = "object-list"
    icon = "boxes"
}