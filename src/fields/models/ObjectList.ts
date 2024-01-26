import { Constructor } from "src/typings/types"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"

export interface Options extends BaseOptions { }

export function settingsModal(Base: Constructor<ISettingsModal<Options>>): Constructor<ISettingsModal<Options>> {
    return class ObjectListSettingsModal extends Base { }
}

export class Base implements IFieldBase {
    tooltip: "Accepts a list of object fields"
    colorClass: "lookup"
    type = <const>"ObjectList"
    tagName = "object-list"
    icon = "boxes"
}