import { App, Setting, TFile } from "obsidian";
import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldManager, FieldTypeTagClass } from "src/types/fieldTypes";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as F } from "src/fields/FieldManager";

export default class FieldSetting extends Setting {
    public field: Field;
    private app: App;
    private plugin: MetadataMenu;
    private containerEl: HTMLElement;
    private fieldNameContainer: HTMLSpanElement;
    private typeContainer: HTMLSpanElement;
    private fieldOptionsContainer: HTMLSpanElement;

    constructor(containerEl: HTMLElement, property: Field, app: App, plugin: MetadataMenu) {
        super(containerEl);
        this.containerEl = containerEl;
        this.field = property;
        this.app = app;
        this.plugin = plugin;
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();
    };

    public setTextContentWithname(): void {

        const manager = new FieldManager[this.field.type](this.field) as F;
        this.infoEl.textContent = "";
        this.infoEl.addClass("metadata-menu-setting-item")
        this.fieldNameContainer = this.infoEl.createEl("div", "metadata-menu-setting-item-name")
        this.fieldNameContainer.setText(this.field.name)
        this.typeContainer = this.infoEl.createEl("div")
        this.typeContainer.setAttr("class", `metadata-menu-setting-item-info-type ${FieldTypeTagClass[this.field.type]}`)
        this.typeContainer.setText(this.field.type)
        this.fieldOptionsContainer = this.infoEl.createEl("div")
        this.fieldOptionsContainer.setText(`${manager.getOptionsStr()}`)
    };

    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FieldSettingsModal(this.app, this.plugin, this.containerEl, this, this.field);
                    modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingProperty = this.plugin.initialProperties.filter(p => p.id == this.field.id)[0];
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