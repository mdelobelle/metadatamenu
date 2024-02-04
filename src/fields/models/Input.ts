import { ButtonComponent, DropdownComponent, Menu, Notice, TFile, TextAreaComponent, TextComponent, setIcon } from "obsidian"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal as IBaseSettingsModal } from "../base/BaseSetting"
import { getIcon } from "../Fields"
import { IFieldManager, Target, isSingleTargeted, baseDisplayValue, fieldValueManager, isSuggest, isFieldActions, ActionLocation, IField, baseGetValueString } from "../Field"
import MetadataMenu from "main"
import { IBasicModal, basicModal } from "../base/BaseModal"
import { cleanActions } from "src/utils/modals"
import { Constructor } from "src/typings/types"
import { getExistingFieldForIndexedPath } from "../ExistingField"
import { insertAndDispatch } from "src/tests/utils"

export class Base implements IFieldBase {
    type = <const>"Input"
    tagName = "single"
    icon = "pencil"
    tooltip = "Accepts any value"
    colorClass = "single"
}

export interface Options extends BaseOptions {
    template?: string
}

export interface DefaultedOptions extends Options { }

export const DefaultOptions: DefaultedOptions = {}

export interface ISettingsModal extends IBaseSettingsModal<Options> {
    templateValue: TextAreaComponent
}

export function settingsModal(Base: Constructor<IBaseSettingsModal<DefaultedOptions>>): Constructor<ISettingsModal> {
    return class InputSettingModal extends Base {
        templateValue: TextAreaComponent
        createSettingContainer = () => {
            const container = this.optionsContainer
            this.field.options.template
            container.createEl("span", { text: "Template", cls: 'label' })
            const templateContainer = container.createDiv({ cls: "field-container" });
            this.templateValue = new TextAreaComponent(templateContainer)
            const templateValue = this.templateValue
            templateValue.inputEl.cols = 50;
            templateValue.inputEl.rows = 4;
            templateValue.inputEl.addClass("full-width")
            templateValue.setValue(this.field.options.template || "")
            templateValue.onChange((value: string) => {
                this.field.options.template = value
            });
            templateValue.inputEl.setAttr("id", "template-input")
        }

        validateOptions(): boolean {
            return true
        }
    }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    //TODO inserer le multi target change
    const base = basicModal(managedField, plugin)
    return class ValueModal extends base {
        private templateValues: Record<string, string> = {};
        private renderedValue: TextAreaComponent;
        public managedField: IFieldManager<Target, Options>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.titleEl.setText(`Change Value for <${this.managedField.name}>`)
            this.build()
        }

        build() {
            const options = this.managedField.options
            if (options.template) {
                const templateFieldRegex = new RegExp(`\\{\\{(?<field>[^\\}]+?)\\}\\}`, "gu");
                const tF = options.template.matchAll(templateFieldRegex)
                let next = tF.next();
                while (!next.done) {
                    if (next.value.groups) {
                        const value = next.value.groups.field
                        const [name, optionsString] = value.split(/:(.*)/s).map((v: string) => v.trim())
                        this.templateValues[name] = "";
                        if (optionsString) {
                            try {
                                const options = JSON.parse(optionsString);
                                this.buildTemplateSelectItem(options.template, this.contentEl.createDiv({ cls: "field-container" }), name, options);
                            } catch ({ name: errorName, message }) {
                                const notice = `{{${name}}} field definition is not a valid JSON \n` +
                                    `in <${this.managedField.name}> ${this.managedField.fileClassName ? this.managedField.fileClassName : "Metadata Menu"} settings`
                                if (errorName === "SyntaxError") new Notice(notice, 5000)
                            }
                        } else {
                            this.buildTemplateInputItem(options.template, this.contentEl.createDiv({ cls: "field-container" }), name);
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

        private renderValue(template: string) {
            let renderedString = template.slice()
            Object.keys(this.templateValues).forEach(k => {
                const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
                renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
            })

            this.renderedValue.setValue(renderedString.replaceAll("\n", ", "))
            this.managedField.value = renderedString.replaceAll("\n", ", ")
        }

        private buildTemplateInputItem(template: string, fieldContainer: HTMLDivElement, name: string) {
            fieldContainer.createDiv({ cls: "label", text: name });
            const input = new TextComponent(fieldContainer);
            input.inputEl.addClass("with-label");
            input.inputEl.addClass("full-width");
            input.setPlaceholder(`Enter a value for ${name}`);
            input.onChange(value => {
                this.templateValues[name] = value;
                this.renderValue(template);
            });
        }

        private buildTemplateSelectItem(template: string, fieldContainer: HTMLDivElement, name: string, options: string[]) {
            fieldContainer.createDiv({ text: name, cls: "label" });
            fieldContainer.createDiv({ cls: "spacer" })
            const selectEl = new DropdownComponent(fieldContainer);
            selectEl.addOption("", "--select--")
            options.forEach(o => selectEl.addOption(o, o));
            selectEl.onChange(value => {
                this.templateValues[name] = value;
                this.renderValue(template);
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
                this.close()
            })
            //cancel button
            const cancelButton = new ButtonComponent(buttonContainer)
            cancelButton.setIcon("cross")
            cancelButton.onClick(() => { this.close(); })
            this.modalEl.appendChild(buttonContainer)
        }

        public async save(): Promise<void> {
            this.managedField.save()
            this.close()
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return baseGetValueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked = () => { }) {
    return baseDisplayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
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

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath?: string): void {
    const iconName = getIcon(field.type);

    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)?.openModal()
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${field.name}`,
            actionLabel: `<span>Update <b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        location.addOption(iconName, action, `Update ${field.name}'s value`);
    }
}

export function getOptionsStr(field: IField<Options>): string {
    return field.options.template || ""
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return true
}

//#region test
export async function enterFieldSetting(settingModal: ISettingsModal, field: IField<Options>, speed = 100) {
    if (field.options?.template !== undefined) {
        insertAndDispatch(settingModal.templateValue, field.options.template)
        const input = settingModal.containerEl.querySelector("#template-input") as HTMLInputElement
        if (!input) throw Error("Template input not found")
        if (!(input.value === settingModal.templateValue.getValue())) throw Error("Template input error")
    }
}
//#endregion

