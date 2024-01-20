import { FuzzyMatch, TFile, TextAreaComponent, setIcon } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { BaseValueModal, IBaseValueModal } from "src/fields/base/BaseModal"
import { BaseOptions, IFieldBase } from "src/fields/base/BaseField"
import { FieldType } from "src/fields/Fields"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { IFieldManager, Target, isSingleTargeted } from "src/fields/Field"
import * as FileBasedField from "src/fields/models/baseModels/FileBasedField"
import { buildMarkDownLink } from "src/fields/models/baseModels/FileBasedField"
import { getLink } from "src/utils/parser"
import { Link } from "src/types/dataviewTypes"

export class Base extends FileBasedField.Base implements IFieldBase {
    type = FieldType.File
    tooltip = "Accepts an internal link"
}

export interface Options extends FileBasedField.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = FileBasedField.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<FileBasedField.Modal<Target>> {
    const base = FileBasedField.valueModal(managedField, plugin)
    return class ValueModal extends base {
        private selectedFilePath?: string
        constructor(...rest: any[]) {
            super()
            if (isSingleTargeted(this.managedField)) this.selectedFilePath = getLink(this.managedField.value, this.managedField.target)?.path
        }

        async onChooseItem(item: TFile): Promise<void> {
            const dvApi = plugin.app.plugins.plugins.dataview?.api
            let alias: string | undefined = undefined;
            if (dvApi && this.managedField.options.customRendering) {
                alias = new Function("page", `return ${this.managedField.options.customRendering}`)(dvApi.page(item.path))
            }
            this.managedField.value = buildMarkDownLink(plugin, item, item.path, undefined, alias)
            this.managedField.save()
            this.previousModal?.open()
        }

        renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
            const dvApi = plugin.app.plugins.plugins.dataview?.api
            if (dvApi && this.managedField.options.customRendering) {
                const suggestionContainer = el.createDiv({ cls: "item-with-add-on" });
                suggestionContainer.createDiv({
                    text: new Function("page", `return ${this.managedField.options.customRendering}`)(dvApi.page(value.item.path))
                })
                const filePath = suggestionContainer.createDiv({ cls: "add-on" })
                filePath.setText(value.item.path)
            } else {
                el.setText(value.item.basename)
            }
            el.addClass("value-container")
            const spacer = this.containerEl.createDiv({ cls: "spacer" })
            el.appendChild(spacer)
            if (this.selectedFilePath === value.item.path) {
                el.addClass("value-checked")
                const iconContainer = el.createDiv({ cls: "icon-container" })
                setIcon(iconContainer, "check-circle")
            }
            this.inputEl.focus()
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
    return FileBasedField.createDvField(managedField, dv, p, fieldContainer, attrs)
}