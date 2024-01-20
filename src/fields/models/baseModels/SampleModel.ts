import { TextAreaComponent } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { BaseValueModal, IBaseValueModal } from "src/fields/base/BaseModal"
import { BaseOptions, IFieldBase } from "src/fields/base/BaseField"
import { FieldType } from "src/fields/Fields"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { IFieldManager, Target } from "src/fields/Field"

export class Base implements IFieldBase {
    type = FieldType.Input
    tagName = "single"
    icon = "pencil"
    tooltip = "Accepts any value"
    colorClass = "single"
}

export interface Options extends BaseOptions {
    template?: string
}

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class InputSettingModal extends Base {
        createSettingContainer = () => {

        }
    }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<IBaseValueModal<Target>> {
    //TODO inserer le multi target change
    return class ValueModal extends BaseValueModal<Target> {
        private templateValues: Record<string, string> = {};
        private renderedValue: TextAreaComponent;
        public managedField: IFieldManager<Target>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
        }
    }
}

export function createDvField(
    managedField: IFieldManager<Target>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
}