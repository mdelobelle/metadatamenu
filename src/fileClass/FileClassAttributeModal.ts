import MetadataMenu from "main";
import Field from "src/fields/Field";
import { SettingLocation } from "src/fields/FieldManager";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FileClass } from "src/fileClass/fileClass";
import { BaseSettingModal } from "src/settings/BaseSettingModal";

export class FileClassAttributeModal extends BaseSettingModal {

    constructor(
        public plugin: MetadataMenu,
        private fileClass: FileClass,
        private attr?: FileClassAttribute
    ) {
        super(plugin);
        this.initFieldAndLocation()
        this.initFieldManagerAndCommand()
    }

    public isNew(): boolean {
        return !this.field.id
    }
    public initFieldAndLocation(field?: Field) {
        if (this.attr) {
            this.field = this.attr.getField()
            Field.copyProperty(this.initialField, this.field)
        } else {
            this.field = new Field(this.plugin);
            this.field.fileClassName = this.fileClass.name
        }
        this.location = SettingLocation.FileClassAttributeSettings
    }

    public async onSave(): Promise<void> {
        await this.fileClass.updateAttribute(
            this.field.type,
            this.field.name,
            this.field.options,
            this.attr,
            this.field.command,
            this.field.display,
            this.field.style,
            this.field.path
        );
    }

    public onCancel(): void {
        this.close();
    }

    public getFileClassName(): string | undefined {
        return this.fileClass.name
    }

    public setFileClassName() {
        this.field.fileClassName = this.fileClass.name
    }

    public async removeField(): Promise<void> {
        if (this.attr) await this.fileClass.removeAttribute(this.attr);
    }
}