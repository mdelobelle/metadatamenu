import MetadataMenu from "main";
import { SettingLocation } from "src/fields/FieldManager";
import FieldSetting from "src/settings/FieldSetting";
import { BaseSettingModal } from "./BaseSettingModal";
import { incrementVersion } from "./MetadataMenuSettings";
import { Field, buildEmptyField, copyProperty, getNewFieldId } from "src/fields/Field";

export default class FieldSettingsModal extends BaseSettingModal {
    private saved: boolean = false;
    private new: boolean = true;

    constructor(
        public plugin: MetadataMenu,
        private parentSettingContainer: HTMLElement,
        private parentSetting?: FieldSetting,
        field?: Field
    ) {
        super(plugin);
        this.initialField = new (buildEmptyField(plugin, undefined));
        this.initFieldAndLocation(field)
        this.initFieldManagerAndCommand()
    }

    public isNew(): boolean {
        return this.new
    }

    public initFieldAndLocation(field?: Field) {
        if (field) {
            this.new = false;
            this.field = field
            copyProperty(this.initialField, this.field)
        } else {
            this.field = new (buildEmptyField(this.plugin, undefined));
            const id = getNewFieldId(this.plugin)
            this.field.id = id;
            this.initialField.id = id;
        }
        this.location = SettingLocation.PluginSettings
    }

    public async onSave(): Promise<void> {
        this.saved = true;
        const currentExistingField = this.plugin.presetFields.filter(p => p.id == this.field.id)[0];
        if (currentExistingField) {
            copyProperty(currentExistingField, this.field);
        } else {
            this.plugin.presetFields.push(this.field);
        };
        copyProperty(this.initialField, this.field)
        if (this.parentSetting) copyProperty(this.parentSetting.field, this.field);
        this.parentSetting?.setTextContentWithname()
        incrementVersion(this.plugin)
        await this.plugin.saveSettings();
    }

    public onCancel(): void {
        this.saved = false;
        /* reset options from settings */
        if (this.initialField.name != "") {
            Object.assign(this.field, this.initialField);
        };
        this.close();
    }

    public getFileClassName(): string | undefined { return }

    public setFileClassName() { }

    public async removeField(): Promise<void> {
        const currentExistingProperty = this.plugin.presetFields.filter(p => p.id == this.field.id)[0];
        if (currentExistingProperty) {
            this.plugin.presetFields.remove(currentExistingProperty);
        };
        await this.plugin.saveSettings();
    }


    onClose(): void {
        Object.assign(this.field, this.initialField);
        if (!this.new && this.parentSetting) {
            this.parentSetting.setTextContentWithname()
        } else if (this.saved) {
            new FieldSetting(this.parentSettingContainer, this.field, this.plugin);
        };
    };
};