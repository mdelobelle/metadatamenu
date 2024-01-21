import { TFile } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { IFieldBase } from "src/fields/base/BaseField"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { IFieldManager, Target, isSingleTargeted } from "src/fields/Field"
import * as AbstractMedia from "src/fields/models/abstractModels/AbstractMedia"
import { getLink } from "src/utils/parser"
import { MediaType, extensionMediaTypes } from "src/fields/models/abstractModels/AbstractMedia"

export class Base extends AbstractMedia.Base implements IFieldBase {
    type = <const>"Media"
    tooltip = "Accepts a link to a media file"
}

export interface Options extends AbstractMedia.Options { }
export interface DefaultedOptions extends AbstractMedia.DefaultedOptions { }
export const DefaultOptions: AbstractMedia.DefaultedOptions = AbstractMedia.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal<AbstractMedia.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractMedia.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractMedia.Modal<Target>> {
    const base = AbstractMedia.valueModal(managedField, plugin)
    return class ValueModal extends base {
        constructor(...rest: any[]) {
            super()
            if (isSingleTargeted(this.managedField)) {
                const path = getLink(this.managedField.value, this.managedField.target)?.path
                if (path) {
                    const file = managedField.plugin.app.vault.getAbstractFileByPath(path)
                    if (
                        file instanceof TFile &&
                        !this.selectedFiles
                            .map(_f => _f.path)
                            .includes(file.path)
                    ) this.selectedFiles.push(file)
                }
            }
        }

        async onChooseItem(item: TFile): Promise<void> {
            const embed = managedField.options.embed
            const alias = extensionMediaTypes[item.extension] === MediaType.Image ? managedField.options.thumbnailSize : undefined
            const baseValue = AbstractMedia.buildMediaLink(plugin, item, item.path, embed ? alias : undefined)
            const value = managedField.options.embed ? baseValue : baseValue.replace(/^\!/, "")
            managedField.value = value
            managedField.save()
            this.previousModal?.open()
        }
    }
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    return AbstractMedia.createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any): void {
    return AbstractMedia.displayValue(managedField, container, onClicked)
}