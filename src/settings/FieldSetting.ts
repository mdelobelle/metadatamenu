import { setIcon, Setting, TFile } from "obsidian";
import MetadataMenu from "main";
import Field from "src/fields/_Field";
import { FieldTypeTagClass } from "src/types/fieldTypes";
import { openSettings } from "src/fields/base/BaseSetting";
import { getField } from "src/fields/Field";
import { getOptionStr } from "src/fields/Fields";

export default class FieldSetting extends Setting {
    private fieldNameContainer: HTMLDivElement;
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
        const field = getField(this.field.id, this.field.fileClassName, this.plugin)
        if (!field) return
        this.infoEl.textContent = "";
        this.infoEl.addClass("setting-item")
        this.fieldNameContainer = this.infoEl.createDiv({ cls: "name" })

        const level = !this.field.path ? 0 : this.field.path.split("____").length
        for (let i = 0; i < level; i++) {
            const indentation = this.fieldNameContainer.createDiv({ cls: "indentation" })
            if (i === level - 1) { setIcon(indentation, "corner-down-right") }
        }
        this.fieldNameContainer.createDiv({ text: `${this.field.name}` })
        this.typeContainer = this.infoEl.createEl("div")
        this.typeContainer.setAttr("class", `chip ${FieldTypeTagClass[this.field.type]}`)
        this.typeContainer.setText(this.field.type)
        this.fieldOptionsContainer = this.infoEl.createEl("div")
        this.fieldOptionsContainer.setText(`${getOptionStr(field.type)(field)}`)
    };

    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    openSettings(this.field.id, undefined, this.plugin, this, this.containerEl)
                    //let modal = new FieldSettingsModal(this.plugin, this.containerEl, this, this.field);
                    //modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingProperty = this.plugin.presetFields.filter(p => p.id == this.field.id)[0];
                    if (currentExistingProperty) {
                        this.plugin.presetFields.remove(currentExistingProperty);
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