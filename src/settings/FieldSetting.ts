import { Setting, TFile } from "obsidian";
import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldManager, FieldTypeTagClass } from "src/types/fieldTypes";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldManager as F } from "src/fields/FieldManager";

export default class FieldSetting extends Setting {
    private fieldNameContainer: HTMLSpanElement;
    private typeContainer: HTMLSpanElement;
    private fieldOptionsContainer: HTMLSpanElement;

    constructor(
        private containerEl: HTMLElement,
        public field: Field,
        private plugin: MetadataMenu
    ) {
        super(containerEl);
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();
        this.settingEl.addClass("no-border")
    };

    public setTextContentWithname(): void {

        const manager = new FieldManager[this.field.type](this.plugin, this.field) as F;
        this.infoEl.textContent = "";
        this.infoEl.addClass("setting-item")
        this.fieldNameContainer = this.infoEl.createEl("div", "name")
        this.fieldNameContainer.setText(this.field.name)
        this.typeContainer = this.infoEl.createEl("div")
        this.typeContainer.setAttr("class", `chip ${FieldTypeTagClass[this.field.type]}`)
        this.typeContainer.setText(this.field.type)
        this.fieldOptionsContainer = this.infoEl.createEl("div")
        this.fieldOptionsContainer.setText(`${manager.getOptionsStr()}`)
    };

    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FieldSettingsModal(this.plugin, this.containerEl, this, this.field);
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

    public static async getValuesListFromNote(plugin: MetadataMenu, notePath: string): Promise<string[]> {
        let values: Array<string> = [];
        const file = plugin.app.vault.getAbstractFileByPath(notePath);
        if (file instanceof TFile && file.extension == "md") {
            const result = await plugin.app.vault.read(file)
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