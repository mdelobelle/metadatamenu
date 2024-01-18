import { TextAreaComponent, TextComponent } from "obsidian"
import { FieldBase, FieldType, Options } from "../BaseField"
import { IManagedField, Target, basicModal, isSingleTargeted } from "../Field"
import { ISettingsModal } from "../BaseSetting"
import { Constructor } from "../Fields"


export interface InputOptions extends Options {
    template?: string
}

export function inputSettingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class InputSettingModal extends Base {
        createSettingContainer = () => {
            const container = this.optionsContainer
            const field = this.field
            container.createEl("span", { text: "Template", cls: 'label' })
            const templateContainer = container.createDiv({ cls: "field-container" });
            const templateValue = new TextAreaComponent(templateContainer)
            templateValue.inputEl.cols = 50;
            templateValue.inputEl.rows = 4;
            templateValue.inputEl.addClass("full-width")
            templateValue.setValue(field.options.template || "")
            templateValue.onChange((value: string) => {
                field.options.template = value;
            })
        }
    }
}

export class InputBase extends FieldBase {
    type = FieldType.Input
    tagName = "single"
    icon = "pencil"
}