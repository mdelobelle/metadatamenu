import { App, Setting, TFile } from "obsidian";
import MetadataMenu from "main";
import Field from "src/Field";
import FieldSettingsModal from "src/settings/FieldSettingsModal";

export default class FieldSetting extends Setting {
    private property: Field;
    private app: App;
    private plugin: MetadataMenu;
    private containerEl: HTMLElement;
    constructor(containerEl: HTMLElement, property: Field, app: App, plugin: MetadataMenu) {
        super(containerEl);
        this.containerEl = containerEl;
        this.property = property;
        this.app = app;
        this.plugin = plugin;
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();

    };

    private setTextContentWithname(): void {
        this.infoEl.textContent =
            `${this.property.name}: [${Object.keys(this.property.values).map(k => this.property.values[k]).join(', ')}]`;
    };


    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FieldSettingsModal(this.app, this.plugin, this.containerEl, this, this.property);
                    modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingProperty = this.plugin.initialProperties.filter(p => p.id == this.property.id)[0];
                    if (currentExistingProperty) {
                        this.plugin.initialProperties.remove(currentExistingProperty);
                    };
                    this.settingEl.parentElement?.removeChild(this.settingEl);
                    this.plugin.saveSettings();
                });
        });
    };

    public static async getValuesListFromNote(notePath: string, app: App): Promise<string[]> {
        let values: Array<string> = [];
        const file = app.vault.getAbstractFileByPath(notePath);
        if (file instanceof TFile && file.extension == "md") {
            const result = await app.vault.read(file)
            result.split('\n').forEach(line => {
                if (/^(.*)$/.test(line)) {
                    values.push(line.trim());
                };
            });
            return values;
        } else {
            return [];
        };
    };
};