import { TFile } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { IFieldBase } from "src/fields/base/BaseField"
import { FieldType } from "src/fields/Fields"
import { ISettingsModal } from "src/fields/base/BaseSetting"
import { IFieldManager, Target, isSingleTargeted } from "src/fields/Field"
import * as MediaBasedField from "src/fields/models/baseModels/MediaBasedField"
import { getLink } from "src/utils/parser"
import { MediaType, extensionMediaTypes } from "src/fields/models/baseModels/MediaBasedField"

export class Base extends MediaBasedField.Base implements IFieldBase {
    type = FieldType.Media
    tooltip = "Accepts a link to a media file"
}

export interface Options extends MediaBasedField.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = MediaBasedField.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<MediaBasedField.Modal<Target>> {
    const base = MediaBasedField.valueModal(managedField, plugin)
    return class ValueModal extends base {
        private selectedFilePath?: string
        constructor(...rest: any[]) {
            super()
            if (isSingleTargeted(this.managedField)) this.selectedFilePath = getLink(this.managedField.value, this.managedField.target)?.path
        }

        async onChooseItem(item: TFile): Promise<void> {
            const embed = managedField.options.embed
            const alias = extensionMediaTypes[item.extension] === MediaType.Image ? managedField.options.thumbnailSize : undefined
            const baseValue = MediaBasedField.buildMediaLink(plugin, item, item.path, embed ? alias : undefined)
            const value = managedField.options.embed ? baseValue : baseValue.replace(/^\!/, "")
            managedField.value = value
            managedField.save()
            this.previousModal?.open()
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
    return MediaBasedField.createDvField(managedField, dv, p, fieldContainer, attrs)
}