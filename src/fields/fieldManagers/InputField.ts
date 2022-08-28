import MetadataMenu from "main";
import { App, Menu, setIcon, TextAreaComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/optionModals/FieldCommandSuggestModal";
import InputModal from "src/optionModals/fields/InputModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";

export default class InputField extends FieldManager {

    constructor(field: Field) {
        super(field, FieldType.Input)
    }

    getOptionsStr(): string {
        return this.field.options.template
    }

    addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new InputModal(app, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        if (InputField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Input]);
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            })
        } else if (InputField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Input]
            });
        };
    };

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu): void {
        const templateContainer = parentContainer.createDiv();
        templateContainer.createEl("span", { text: "Template", cls: 'metadata-menu-field-option' })
        const templateValue = new TextAreaComponent(templateContainer)
        templateValue.inputEl.cols = 50;
        templateValue.inputEl.rows = 4;
        templateValue.setValue(this.field.options.template || "")
        templateValue.onChange((value: string) => {
            this.field.options.template = value;

        })
    }

    validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new InputModal(app, file, this.field, "", lineNumber, inFrontmatter, after);
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
        setIcon(button, FieldIcon[FieldType.Input])
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
        setIcon(validateIcon, "checkmark")
        validateIcon.setAttr("class", "metadata-menu-dv-field-button")
        validateIcon.onclick = (e) => {
            InputField.replaceValues(plugin.app, p["file"]["path"], this.field.name, input.value);
            fieldContainer.removeChild(inputContainer)
        }
        inputContainer?.appendChild(validateIcon)
        const cancelIcon = document.createElement("button")
        cancelIcon.setAttr("class", "metadata-menu-dv-field-button")
        setIcon(cancelIcon, "cross");
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
            if (this.field.options.template) {
                const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension === 'md') {
                    const inputModal = new InputModal(plugin.app, file, this.field, p[this.field.name]);
                    inputModal.open();
                }

            } else {
                fieldContainer.removeChild(fieldValue)
                fieldContainer.removeChild(button)
                fieldContainer.removeChild(spacer)
                fieldContainer.appendChild(inputContainer)
                input.focus()
            }
        }
        /* initial state */
        fieldContainer.appendChild(button)
        fieldContainer.appendChild(fieldValue)
        fieldContainer.appendChild(spacer)
    }
}