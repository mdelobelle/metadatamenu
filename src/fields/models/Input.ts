import { ButtonComponent, DropdownComponent, Notice, TFile, TextAreaComponent, TextComponent, setIcon } from "obsidian"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal } from "../base/BaseSetting"
import { Constructor, FieldType, getIcon } from "../Fields"
import { IFieldManager, Target, isSingleTargeted } from "../Field"
import MetadataMenu from "main"
import { IBasicModal, basicModal } from "../base/BaseModal"
import { cleanActions } from "src/utils/modals"

export class Base implements IFieldBase {
    type = FieldType.Input
    tagName = "single"
    icon = "pencil"
}

export interface Options extends BaseOptions {
    template?: string
}

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    return class InputSettingModal extends Base {
        createSettingContainer = () => {
            const container = this.optionsContainer
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
    }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    //TODO inserer le multi target change
    const base = basicModal(managedField, plugin)
    return class BaseValueModal extends base {
        private templateValues: Record<string, string> = {};
        private renderedValue: TextAreaComponent;
        public managedField: IFieldManager<Target>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(`<PROTO> Change Value for <${this.managedField.name}>`)
            this.build()
        }

        build() {
            if (this.managedField.options.template) {
                const templateFieldRegex = new RegExp(`\\{\\{(?<field>[^\\}]+?)\\}\\}`, "gu");
                const tF = this.managedField.options.template.matchAll(templateFieldRegex)
                let next = tF.next();
                while (!next.done) {
                    if (next.value.groups) {
                        const value = next.value.groups.field
                        const [name, optionsString] = value.split(/:(.*)/s).map((v: string) => v.trim())
                        this.templateValues[name] = "";
                        if (optionsString) {
                            try {
                                const options = JSON.parse(optionsString);
                                this.buildTemplateSelectItem(this.contentEl.createDiv({ cls: "field-container" }), name, options);
                            } catch ({ name: errorName, message }) {
                                const notice = `{{${name}}} field definition is not a valid JSON \n` +
                                    `in <${this.managedField.name}> ${this.managedField.fileClassName ? this.managedField.fileClassName : "Metadata Menu"} settings`
                                if (errorName === "SyntaxError") new Notice(notice, 5000)
                            }
                        } else {
                            this.buildTemplateInputItem(this.contentEl.createDiv({ cls: "field-container" }), name);
                        }
                    }
                    next = tF.next()
                }
                this.contentEl.createDiv({ text: "Result preview" });
                this.buildResultPreview(this.contentEl.createDiv({ cls: "field-container" }));
            } else {
                this.buildInputEl(this.contentEl.createDiv({ cls: "field-container" }));
            }
            cleanActions(this.contentEl, ".footer-actions")
            this.buildFooterBtn()
            this.containerEl.addClass("metadata-menu")
        };

        private renderValue() {
            let renderedString = this.managedField.options.template.slice()
            Object.keys(this.templateValues).forEach(k => {
                const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
                renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
            })

            this.renderedValue.setValue(renderedString.replaceAll("\n", ", "))
            this.managedField.value = renderedString.replaceAll("\n", ", ")
        }

        private buildTemplateInputItem(fieldContainer: HTMLDivElement, name: string) {
            fieldContainer.createDiv({ cls: "label", text: name });
            const input = new TextComponent(fieldContainer);
            input.inputEl.addClass("with-label");
            input.inputEl.addClass("full-width");
            input.setPlaceholder(`Enter a value for ${name}`);
            input.onChange(value => {
                this.templateValues[name] = value;
                this.renderValue();
            });
        }

        private buildTemplateSelectItem(fieldContainer: HTMLDivElement, name: string, options: string[]) {
            fieldContainer.createDiv({ text: name, cls: "label" });
            fieldContainer.createDiv({ cls: "spacer" })
            const selectEl = new DropdownComponent(fieldContainer);
            selectEl.addOption("", "--select--")
            options.forEach(o => selectEl.addOption(o, o));
            selectEl.onChange(value => {
                this.templateValues[name] = value;
                this.renderValue();
            })
        }

        private buildResultPreview(fieldContainer: HTMLDivElement) {
            this.renderedValue = new TextAreaComponent(fieldContainer)
            this.renderedValue.inputEl.rows = 3;
            this.renderedValue.inputEl.addClass("full-width")
            if (isSingleTargeted(this.managedField)) {
                this.renderedValue.setValue(this.managedField.value);
            } else {
                this.renderedValue.setPlaceholder("Multiple values");
            }
            this.renderedValue.setValue(this.managedField.value);
            this.renderedValue.onChange(value => this.managedField.value = value)
        }

        private buildInputEl(container: HTMLDivElement): void {
            const inputEl = new TextAreaComponent(container);
            inputEl.inputEl.rows = 3;
            inputEl.inputEl.focus();
            inputEl.inputEl.addClass("full-width");
            if (isSingleTargeted(this.managedField)) {
                inputEl.setValue(this.managedField.value);
            } else {
                inputEl.setPlaceholder("Multiple values");
            }
            inputEl.onChange(value => this.managedField.value = value)
        };



        private buildFooterBtn() {
            const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
            buttonContainer.createDiv({ cls: "spacer" })
            const infoContainer = buttonContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            //confirm button
            const confirmButton = new ButtonComponent(buttonContainer)
            confirmButton.setIcon("checkmark")
            confirmButton.onClick(async () => {
                this.save();
                this.close(true)
            })
            //cancel button
            const cancelButton = new ButtonComponent(buttonContainer)
            cancelButton.setIcon("cross")
            cancelButton.onClick(() => { this.close(true); })
            this.modalEl.appendChild(buttonContainer)
        }

        public async save(): Promise<void> {
            this.managedField.save()
            this.close(true)
        }
    }
}

export function createDvField(
    managedField: IFieldManager<Target>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    /* button to display input */
    const editBtn = fieldContainer.createEl("button");
    const fieldValue = (dv.el('span', p[managedField.name] || "", attrs) as HTMLDivElement);
    fieldContainer.appendChild(fieldValue);

    /* end spacer */
    const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
    if (attrs.options?.alwaysOn) spacer.hide();
    setIcon(editBtn, getIcon("Input"));
    if (!attrs?.options?.alwaysOn) {
        editBtn.hide();
        spacer.show();
        fieldContainer.onmouseover = () => {
            editBtn.show();
            spacer.hide();
        }
        fieldContainer.onmouseout = () => {
            editBtn.hide();
            if (!attrs.options?.alwaysOn) spacer.show();
        }
    }
    /* button on click : remove button and field and display input field*/
    editBtn.onclick = async () => {
        managedField.openModal()
    }
}