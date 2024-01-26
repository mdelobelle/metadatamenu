import { TFile } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { IFieldBase } from "src/fields/base/BaseField"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { ActionLocation, IFieldManager, LegacyField, Target, isSingleTargeted } from "src/fields/Field"
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
            managedField.save(value)
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

export function getOptionsStr(managedField: IFieldManager<Target, Options>): string {
    return AbstractMedia.getOptionsStr(managedField)
}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractMedia.actions(plugin, field, file, location, indexedPath)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    if (Array.isArray(managedField.value) && managedField.value.length == 1) {
        return AbstractMedia.getFiles(managedField).map(f => f.path).includes(managedField.value[0].path)
    } else if (typeof managedField.value === "string") {
        return AbstractMedia.getFiles(managedField).map(f => f.path).includes(managedField.value)
    } else if (managedField.value.hasOwnProperty('path')) {
        return AbstractMedia.getFiles(managedField).map(f => f.path).includes(managedField.value.path)
    } else {
        return false
    }
}