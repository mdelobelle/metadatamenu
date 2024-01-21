import MetadataMenu from "main"
import { FuzzyMatch, TFile, setIcon } from "obsidian"
import { IFieldManager, Target, isSingleTargeted } from "src/fields/Field"
import { IFieldBase } from "src/fields/base/BaseField"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import * as AbstractFile from "src/fields/models/abstractModels/AbstractFile"
import { buildMarkDownLink } from "src/fields/models/abstractModels/AbstractFile"
import { Constructor } from "src/typings/types"
import { getLink } from "src/utils/parser"

export class Base extends AbstractFile.Base implements IFieldBase {
    type = <const>"File"
    tooltip = "Accepts an internal link"
}

export interface Options extends AbstractFile.Options { }

export const DefaultOptions: AbstractFile.DefaultedOptions = AbstractFile.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = AbstractFile.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<AbstractFile.Modal<Target>> {
    const base = AbstractFile.valueModal(managedField, plugin)
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
            this.close()
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
    return AbstractFile.createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function displayValue(managedField: IFieldManager<Target>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractFile.displayValue(managedField, container, onClicked)
}