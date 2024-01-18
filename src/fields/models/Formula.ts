import { FieldBase, FieldType, Options } from "../BaseField"
import { ISettingsModal } from "../BaseSetting"
import { IManagedField, Target, basicModal } from "../Field"
import { Constructor } from "../Fields"

export interface FormulaOptions extends Options {
    formula: string
    autoUpdate: boolean
}

export function formulaSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class FormulaSettingsModal extends Base {

    }
}

export class FormulaBase extends FieldBase {
    type = FieldType.Formula
    tagName = "formula"
    icon = "file-code"
}