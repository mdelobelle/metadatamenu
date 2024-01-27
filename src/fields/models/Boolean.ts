import MetadataMenu from "main"
import { ButtonComponent, TFile } from "obsidian"
import { Constructor } from "src/typings/types"
import { getExistingFieldForIndexedPath } from "../ExistingField"
import { ActionLocation, IField, IFieldManager, Target, baseDisplayValue, fieldValueManager, isFieldActions, isSuggest } from "../Field"
import { getIcon, mapFieldType } from "../Fields"
import { BaseOptions, IFieldBase } from "../base/BaseField"
import { IBasicModal, basicModal } from "../base/BaseModal"
import { ISettingsModal } from "../base/BaseSetting"

export class Base implements IFieldBase {
    type = <const>"Boolean"
    tagName = "boolean"
    icon = "toggle-left"
    tooltip = "Accepts true or false"
    colorClass = "boolean"
}

export interface Options extends BaseOptions { }

export interface DefaultedOptions extends Options { }

export const DefaultOptions: DefaultedOptions = {}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    return class InputSettingModal extends Base {
        createSettingContainer = () => { }

        validateOptions(): boolean {
            return true
        }
    }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    //TODO inserer le multi target change
    const base = basicModal(managedField, plugin)
    return class ValueModal extends base {
        public managedField: IFieldManager<Target, Options>
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.containerEl.addClass("narrow")
            this.build();
        }

        build() {
            const choicesContainer = this.contentEl.createDiv({ cls: "value-container" })
            choicesContainer.createDiv({ cls: "spacer" });
            const trueButton = new ButtonComponent(choicesContainer);
            trueButton.setButtonText("True")
            trueButton.setClass("left")
            choicesContainer.createDiv({ cls: "spacer" });
            const falseButton = new ButtonComponent(choicesContainer);
            falseButton.setButtonText("False")
            choicesContainer.createDiv({ cls: "spacer" });
            if (managedField.value) {
                trueButton.setCta();
                falseButton.removeCta();
            } else {
                falseButton.setCta();
                trueButton.removeCta();
            }
            falseButton.onClick(() => {
                managedField.value = "false";
                falseButton.setCta();
                trueButton.removeCta();
            })
            trueButton.onClick(() => {
                managedField.value = "true";
                trueButton.setCta();
                falseButton.removeCta();
            })
            this.buildSimpleSaveBtn(choicesContainer)
        };

        public async save(): Promise<void> {
            this.managedField.save()
            //FIXME doesn't close
            this.close()
        }
    }
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
    const checkbox: HTMLInputElement = dv.el("input", "", { ...attrs, "type": "checkbox" })
    checkbox.checked = p[managedField.name]
    fieldContainer.appendChild(checkbox)
    checkbox.onchange = () => managedField.save((!managedField.value).toString())
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath?: string): void {
    const iconName = getIcon(mapFieldType(field.type));

    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)
        if (fieldVM) {
            fieldVM.value = !fieldVM.value
            fieldVM.save()
        }
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${field.name}`,
            actionLabel: `Toggle <span><b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        location.addOption(
            iconName,
            action,
            `Toggle ${field.name}`,
            field.fileClassName,
            file,
            indexedPath,
            plugin
        );
    };
}

export function getOptionsStr(field: IField<Options>): string {
    return ""
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return isBoolean(managedField.value)
}