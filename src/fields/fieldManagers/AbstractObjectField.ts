import MetadataMenu from "main";
import { Menu, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import ObjectModal from "src/modals/fields/ObjectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { FieldOptions } from "src/components/NoteFields";
import { LanguageSupport } from "@codemirror/language";
import { Extension } from "@codemirror/state"

export default abstract class ObjectField extends FieldManager {

    abstract dumpValue(value: any): string;
    abstract getExtraExtensions(): Array<LanguageSupport | Extension>
    abstract loadValue(value: any): any;

    constructor(plugin: MetadataMenu, field: Field, type: FieldType.YAML | FieldType.JSON) {
        super(plugin, field, type)
    }

    public getOptionsStr(): string {
        return this.field.options.template || ""
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const modal = new ObjectModal(this.plugin, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        const iconName = FieldIcon[this.type];
        const action = () => modal.open();
        if (ObjectField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(iconName);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            })
        } else if (ObjectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: iconName
            });
        } else if (ObjectField.isFieldOptions(location)) {
            location.addOption(FieldIcon[this.type], action, `Update ${name}'s value`);
        }
    };

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu): void { }

    public validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        value?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = new ObjectModal(this.plugin, file, this.field, value || "", lineNumber, after, asList, asComment);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = "value-container"
        /* button to display input */
        const editBtn = fieldContainer.createEl("button");
        const fieldValue = (dv.el('span', p[this.field.name], attrs) as HTMLDivElement);
        fieldContainer.appendChild(fieldValue);
        const inputContainer = fieldContainer.createDiv({});
        inputContainer.hide();
        const input = inputContainer.createEl("input");
        input.value = p[this.field.name];
        /* end spacer */
        const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
        if (attrs.options?.alwaysOn) spacer.hide();
        setIcon(editBtn, FieldIcon[FieldType.Input]);
        if (!attrs?.options?.alwaysOn) {
            editBtn.hide();
            spacer.show();
            fieldContainer.onmouseover = () => {
                if (!inputContainer.isShown()) {
                    editBtn.show();
                    spacer.hide();
                }
            }
            fieldContainer.onmouseout = () => {
                editBtn.hide();
                if (!attrs.options?.alwaysOn) spacer.show();
            }
        }

        const validateIcon = inputContainer.createEl("button");
        setIcon(validateIcon, "checkmark");
        validateIcon.onclick = (e) => {
            ObjectField.replaceValues(this.plugin, p.file.path, this.field.name, input.value);
            inputContainer.hide()
        }
        const cancelIcon = inputContainer.createEl("button");
        setIcon(cancelIcon, "cross");
        cancelIcon.onclick = (e) => {
            inputContainer.hide();
            fieldValue.show();
            editBtn.show();
            if (!attrs.options?.alwaysOn) spacer.show();
        }
        input.focus()

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                ObjectField.replaceValues(this.plugin, p.file.path, this.field.name, input.value);
                inputContainer.hide();
            }
            if (e.key === 'Escape') {
                inputContainer.hide();
                fieldValue.show();
                editBtn.show();
                if (!attrs.options?.alwaysOn) spacer.show();
            }
        }
        /* button on click : remove button and field and display input field*/
        editBtn.onclick = () => {
            if (this.field.options.template) {
                const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path);
                if (file instanceof TFile && file.extension === 'md') {
                    const inputModal = new ObjectModal(this.plugin, file, this.field, p[this.field.name]);
                    inputModal.open();
                }
            } else {
                inputContainer.show();
                input.focus()
            }
            fieldValue.hide();
            editBtn.hide();
            spacer.hide();
        }
    }
}