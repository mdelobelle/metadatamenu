import { App, Setting, Plugin } from "obsidian"
import MetadataMenu from "main"
import Field from "src/Field"
import FieldSettingsModal from "src/settings/FieldSettingsModal"

export default class FieldSetting extends Setting {
    property: Field
    app: App
    plugin: MetadataMenu
    containerEl: HTMLElement
    constructor(containerEl: HTMLElement, property: Field, app: App, plugin: MetadataMenu) {
        super(containerEl)
        this.containerEl = containerEl
        this.property = property
        this.app = app
        this.plugin = plugin
        this.setTextContentWithname()
        this.addEditButton()
        this.addDeleteButton()

    }

    setTextContentWithname(): void {
        this.infoEl.textContent =
            `${this.property.name}: [${Object.keys(this.property.values).map(k => this.property.values[k]).join(', ')}]`
    }


    addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FieldSettingsModal(this.app, this.plugin, this.containerEl, this, this.property);
                    modal.open();
                });
        })
    }

    addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingProperty = this.plugin.initialProperties.filter(p => p.id == this.property.id)[0]
                    if (currentExistingProperty) {
                        this.plugin.initialProperties.remove(currentExistingProperty)
                    }
                    this.settingEl.parentElement?.removeChild(this.settingEl)
                    this.plugin.saveSettings()
                });
        });
    }

    static getValuesListFromNote(notePath: string, app: App): Promise<string[]> {
        return new Promise((resolve, reject) => {
            let values: Array<string> = []
            const files = app.vault.getMarkdownFiles().filter(mdFile => mdFile.path == notePath)
            if (files.length > 0) {
                const file = files[0]
                app.vault.read(file).then((result: string) => {
                    result.split('\n').forEach(line => {
                        if (/^(.*)$/.test(line)) {
                            values.push(line.trim())
                        }
                    })
                    resolve(values)
                })
            } else {
                resolve([])
            }
        });

    }
}