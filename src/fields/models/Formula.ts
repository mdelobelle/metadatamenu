import { Constructor } from "src/typings/types"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import { FieldType } from "../Fields"

export interface Options extends BaseOptions {
    formula: string
    autoUpdate: boolean
}

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class FormulaSettingsModal extends Base {

    }
}

export class Base implements IFieldBase {
    colorClass: "lookup"
    type = <const>"Formula"
    tagName = "formula"
    icon = "file-code"
    tooltip = "Accepts a formula"

}