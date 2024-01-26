import MetadataMenu from "main";
import { Menu, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import InputModal, { MultiFilesInputModal } from "src/modals/fields/InputModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import { FieldManager } from "../FieldManager";
import { FieldOptions } from "src/components/FieldsModal";
import { ExistingField } from "../ExistingField";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import ObjectModal from "src/modals/fields/ObjectModal";
import { Note } from "src/note/note";
import { fieldValueManager } from "../Field";
import { getActions } from "../Fields";

export default class InputField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Input)
    }

    public getOptionsStr(): string {
        return this.field.options.template || ""
    }

    private async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        fieldValueManager(this.plugin, this.field.id, this.field.fileClassName, file, eF, indexedPath)?.openModal()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        return getActions("Input")(this.plugin, this.field, file, location, indexedPath)
        /*
        const name = this.field.name
        const iconName = FieldIcon[FieldType.Input];
        const action = async () => await this.buildAndOpenModal(file, indexedPath);
        if (InputField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: iconName
            });
        } else if (InputField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.Input], action, `Update ${name}'s value`);
        }
        */
    };

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu): void {
        container.createEl("span", { text: "Template", cls: 'label' })
        const templateContainer = container.createDiv({ cls: "field-container" });
        const templateValue = new TextAreaComponent(templateContainer)
        templateValue.inputEl.cols = 50;
        templateValue.inputEl.rows = 4;
        templateValue.inputEl.addClass("full-width")
        templateValue.setValue(this.field.options.template || "")
        templateValue.onChange((value: string) => {
            this.field.options.template = value;
        })
    }

    public validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): void {
        const fieldModal = new InputModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }


    public createAndOpenMultiFilesFieldModal(
        files: TFile[],
        selectedFieldName: string,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
    ): void {
        const fieldModal = new MultiFilesInputModal(this.plugin, files, this.field, indexedPath, lineNumber, asList, asBlockquote);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        // attrs.cls = "value-container"
        // /* button to display input */
        // const editBtn = fieldContainer.createEl("button");
        // const fieldValue = (dv.el('span', p[this.field.name] || "", attrs) as HTMLDivElement);
        // fieldContainer.appendChild(fieldValue);
        // const inputContainer = fieldContainer.createDiv({});
        // inputContainer.hide();
        // const input = inputContainer.createEl("input");
        // input.value = p[this.field.name];
        // /* end spacer */
        // const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
        // if (attrs.options?.alwaysOn) spacer.hide();
        // setIcon(editBtn, FieldIcon[FieldType.Input]);
        // if (!attrs?.options?.alwaysOn) {
        //     editBtn.hide();
        //     spacer.show();
        //     fieldContainer.onmouseover = () => {
        //         if (!inputContainer.isShown()) {
        //             editBtn.show();
        //             spacer.hide();
        //         }
        //     }
        //     fieldContainer.onmouseout = () => {
        //         editBtn.hide();
        //         if (!attrs.options?.alwaysOn) spacer.show();
        //     }
        // }

        // const validateIcon = inputContainer.createEl("button");
        // setIcon(validateIcon, "checkmark");
        // validateIcon.onclick = (e) => {
        //     InputField.replaceValues(this.plugin, p.file.path, this.field.id, input.value);
        //     inputContainer.hide()
        // }
        // const cancelIcon = inputContainer.createEl("button");
        // setIcon(cancelIcon, "cross");
        // cancelIcon.onclick = (e) => {
        //     inputContainer.hide();
        //     fieldValue.show();
        //     editBtn.show();
        //     if (!attrs.options?.alwaysOn) spacer.show();
        // }
        // input.focus()

        // input.onkeydown = (e) => {
        //     if (e.key === "Enter") {
        //         InputField.replaceValues(this.plugin, p.file.path, this.field.id, input.value);
        //         inputContainer.hide();
        //     }
        //     if (e.key === 'Escape') {
        //         inputContainer.hide();
        //         fieldValue.show();
        //         editBtn.show();
        //         if (!attrs.options?.alwaysOn) spacer.show();
        //     }
        // }
        // //button on click : remove button and field and display input field
        // editBtn.onclick = async () => {
        //     if (this.field.options.template) {
        //         const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path);
        //         if (file instanceof TFile && file.extension === 'md') {
        //             await this.buildAndOpenModal(file, this.field.id)
        //         }
        //     } else {
        //         inputContainer.show();
        //         input.focus()
        //     }
        //     fieldValue.hide();
        //     editBtn.hide();
        //     spacer.hide();
        // }
    }
}