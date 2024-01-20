
import MetadataMenu from "main";
import * as List from "./baseModels/ListBasedField"
import { ISettingsModal } from "../base/BaseSetting";
import { IFieldManager, Target } from "../Field";
import { FieldType } from "../Fields";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";

export interface Options extends List.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = List.settingsModal(Base)
    return class ListBaseSettingsModal extends base {

    }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<List.IListBasedModal<Target>> {
    const base = List.valueModal(managedField, plugin)
    return class ValueModal extends base {
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings();
            this.managedField.value = this.inputEl.value
            this.managedField.save()
            this.close();
        }
    }
}

export class Base implements IFieldBase {
    type = FieldType.Select
    tagName = "select"
    icon = "arrow"
}
