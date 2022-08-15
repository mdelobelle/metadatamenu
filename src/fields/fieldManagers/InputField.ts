import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import valueTextInputModal from "src/optionModals/valueTextInputModal";
import { App, Menu, TFile } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";

export default class InputField extends FieldManager {

    constructor(field: Field) {
        super(field, FieldType.Input)
    }

    getOptionsStr(): string {
        return ""
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new valueTextInputModal(app, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        if (InputField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon('pencil');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            })
        } else if (InputField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu): void {
        //no need of settings for standard input field
    }

    validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueTextInputModal(app, file, this.field, "", lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): Promise<void> {
        const fieldValue = dv.el('span', p[this.field.name], attrs)
        const inputContainer = document.createElement("div")
        const input = document.createElement("input")
        input.setAttr("class", "metadata-menu-dv-input")
        inputContainer.appendChild(input)
        input.value = p[this.field.name]
        /* end spacer */
        const spacer = document.createElement("div")
        spacer.setAttr("class", "metadata-menu-dv-field-spacer")
        /* button to display input */
        const button = document.createElement("button")
        button.setText("🖍")
        button.setAttr('class', "metadata-menu-dv-field-button")
        if (!attrs?.options?.alwaysOn) {
            button.hide()
            spacer.show()
            fieldContainer.onmouseover = () => {
                button.show()
                spacer.hide()
            }
            fieldContainer.onmouseout = () => {
                button.hide()
                spacer.show()
            }
        }

        const validateIcon = document.createElement("button")
        validateIcon.textContent = "✅"
        validateIcon.setAttr("class", "metadata-menu-dv-field-button")
        validateIcon.onclick = (e) => {
            InputField.replaceValues(plugin.app, p["file"]["path"], this.field.name, input.value);
            fieldContainer.removeChild(inputContainer)
        }
        inputContainer?.appendChild(validateIcon)
        const cancelIcon = document.createElement("button")
        cancelIcon.setAttr("class", "metadata-menu-dv-field-button")
        cancelIcon.textContent = "❌"
        cancelIcon.onclick = (e) => {
            fieldContainer.removeChild(inputContainer)
            fieldContainer.appendChild(button)
            fieldContainer.appendChild(fieldValue)
            fieldContainer.appendChild(spacer)
        }
        inputContainer.appendChild(cancelIcon)
        input.focus()

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                InputField.replaceValues(plugin.app, p["file"]["path"], this.field.name, input.value);
                fieldContainer.removeChild(inputContainer)
            }
            if (e.key === 'Escape') {
                fieldContainer.removeChild(inputContainer)
                fieldContainer.appendChild(button)
                fieldContainer.appendChild(fieldValue)
                fieldContainer.appendChild(spacer)
            }
        }
        /* button on click : remove button and field and display input field*/
        button.onclick = (e) => {
            fieldContainer.removeChild(fieldValue)
            fieldContainer.removeChild(button)
            fieldContainer.removeChild(spacer)
            fieldContainer.appendChild(inputContainer)
            input.focus()
        }
        /* initial state */
        fieldContainer.appendChild(button)
        fieldContainer.appendChild(fieldValue)
        fieldContainer.appendChild(spacer)
    }
}