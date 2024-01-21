import { ButtonComponent, FuzzyMatch, TFile, setIcon } from "obsidian"
import MetadataMenu from "main"
import { Constructor } from "src/typings/types"
import { IFieldBase } from "src/fields/base/BaseField"
import { IFieldManager, Target, isSingleTargeted } from "src/fields/Field"
import * as AbstractMedia from "src/fields/models/abstractModels/AbstractMedia"
import { extractLinks, getLink } from "src/utils/parser"
import { MediaType, extensionMediaTypes } from "src/fields/models/abstractModels/AbstractMedia"
import { cleanActions } from "src/utils/modals"
import { ISettingsModal } from "../base/BaseSetting"

export class Base extends AbstractMedia.Base implements IFieldBase {
    type = <const>"MultiMedia"
    tooltip = "Accepts multiple links to media files"
}

export interface Options extends AbstractMedia.Options { }

export const DefaultOptions: AbstractMedia.DefaultedOptions = AbstractMedia.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = AbstractMedia.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<AbstractMedia.Modal<Target>> {
    const base = AbstractMedia.valueModal(managedField, plugin)
    return class ValueModal extends base {
        constructor(...rest: any[]) {
            super()
            this.initValues()
            this.build()
        }

        initValues() {
            const vault = this.managedField.plugin.app.vault
            const initialOptions: string | string[] = this.managedField.value || []
            const pushPath = (path: string) => {
                const file = vault.getAbstractFileByPath(path)
                if (
                    file instanceof TFile &&
                    !this.selectedFiles
                        .map(_f => _f.path)
                        .includes(file.path)
                ) this.selectedFiles.push(file)
            }
            if (initialOptions && isSingleTargeted(managedField)) {
                if (Array.isArray(initialOptions)) {
                    // in frontmatter it can be a regular array
                    initialOptions.map(item => {
                        const link = getLink(item, this.managedField.target as TFile)
                        if (link) pushPath(link.path)
                    })
                } else if (typeof initialOptions === "string") {
                    // in inline fields, it can be links comma separated, let's matchAll
                    const links = extractLinks(initialOptions)
                    links.forEach(_link => {
                        const link = getLink(_link, this.managedField.target as TFile)
                        if (link) pushPath(link.path)
                    })
                } else {
                    // it is a DV link from the fieldModifier
                    const link = getLink(initialOptions, this.managedField.target as TFile)
                    if (link) pushPath(link.path)
                }
            } else {
                this.selectedFiles = [];
            }
        }

        build() {
            this.containerEl.onkeydown = async (e) => {
                if (e.key == "Enter" && e.altKey) {
                    e.preventDefault();
                    await this.replaceValues();
                    this.close()
                }
            }
            cleanActions(this.containerEl, ".footer-actions")
            const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
            buttonContainer.createDiv({ cls: "spacer" })
            const infoContainer = buttonContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            //confirm button
            const confirmButton = new ButtonComponent(buttonContainer)
            confirmButton.setIcon("checkmark")
            confirmButton.onClick(async () => {
                await this.replaceValues();
                this.close()
            })
            //cancel button
            const cancelButton = new ButtonComponent(buttonContainer)
            cancelButton.setIcon("cross")
            cancelButton.onClick(() => { this.close(); })
            //clear value button
            const clearButton = new ButtonComponent(buttonContainer)
            clearButton.setIcon("trash")
            clearButton.onClick(async () => {
                await this.clearValues();
                this.close();
            })
            clearButton.buttonEl.addClass("danger")

            this.modalEl.appendChild(buttonContainer)
        }

        async replaceValues() {
            const embed = managedField.options.embed
            const result = this.selectedFiles.map(file => {
                const alias = extensionMediaTypes[file.extension] === MediaType.Image ? managedField.options.thumbnailSize : undefined
                const value = AbstractMedia.buildMediaLink(plugin, file, file.path, embed ? alias : undefined)
                return embed ? value : value.replace(/^\!/, "")
            })
            managedField.value = result.join(", ")
            managedField.save()
        }

        async clearValues() {
            managedField.value = ""
            managedField.save()
        }

        renderSelected() {
            //@ts-ignore
            const chooser = this.chooser
            const suggestions: HTMLDivElement[] = chooser.suggestions
            const values: FuzzyMatch<TFile>[] = chooser.values

            suggestions.forEach((s, i) => {
                if (this.selectedFiles.some(file => file.path === values[i].item.path)) {
                    s.addClass("value-checked")
                    if (s.querySelectorAll(".icon-container").length == 0) {
                        const iconContainer = s.createDiv({ cls: "icon-container" })
                        setIcon(iconContainer, "check-circle")
                    }
                } else {
                    s.removeClass("value-checked")
                    s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
                }
            })
        }

        selectSuggestion(value: FuzzyMatch<TFile>, evt: MouseEvent | KeyboardEvent): void {
            if (this.selectedFiles.includes(value.item)) {
                this.selectedFiles.remove(value.item)
            } else {
                this.selectedFiles.push(value.item)
            }
            this.renderSelected()
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
    return AbstractMedia.createDvField(managedField, dv, p, fieldContainer, attrs)
}

export function displayValue(managedField: IFieldManager<Target>, container: HTMLDivElement, onClicked: () => any): void {
    return AbstractMedia.displayValue(managedField, container, onClicked)
}