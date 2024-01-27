
import MetadataMenu from "main";
import * as AbstractList from "./abstractModels/AbstractList"
import { ISettingsModal } from "../base/BaseSetting";
import { ActionLocation, IField, IFieldManager, LegacyField, Target, fieldValueManager, isFieldActions, isSuggest } from "../Field";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";
import { TFile, ToggleComponent, setIcon } from "obsidian";
import { getOptionsList as baseGetOptionsList } from "./abstractModels/AbstractList";
import { getIcon, mapFieldType } from "../Fields";
import { getExistingFieldForIndexedPath } from "../ExistingField";

export class Base implements IFieldBase {
    type = <const>"Cycle"
    tagName = "cycle"
    icon = "switch"
    tooltip = "Cycles through values from a list"
    colorClass = "cycle"
}

export interface Options extends AbstractList.Options {
    allowNull?: boolean
}

export interface DefaultedOptions extends AbstractList.DefaultedOptions { }

export const DefaultOptions: AbstractList.DefaultedOptions = AbstractList.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal<AbstractList.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractList.settingsModal(Base)
    return class SettingsModal extends base {
        public createSettingContainer(): void {
            const container = this.optionsContainer
            const allowNullValueContainer = container.createDiv({ cls: "field-container" });
            allowNullValueContainer.createDiv({ cls: "label", text: "Cycle begins by a null value" });
            allowNullValueContainer.createDiv({ cls: "spacer" });
            const allowNullToggler = new ToggleComponent(allowNullValueContainer);
            allowNullToggler.setValue(this.field.options.allowNull || false);
            allowNullToggler.onChange(value => this.field.options.allowNull = value);
            super.createSettingContainer();
        }
    }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractList.Modal<Target>> {
    const base = AbstractList.valueModal(managedField, plugin)
    return class ValueModal extends base { }
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractList.displayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    fieldContainer.appendChild(dv.el('span', p[managedField.name] || "", attrs))
    /* end spacer */
    const spacer = fieldContainer.createEl("div", { cls: "spacer-1" })
    /* button to display modal */
    const cycleBtn = fieldContainer.createEl("button")
    setIcon(cycleBtn, getIcon(managedField.type))
    const file = managedField.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
    if (!attrs?.options?.alwaysOn) {
        cycleBtn.hide();
        spacer.show();
        fieldContainer.onmouseover = () => {
            cycleBtn.show();
            spacer.hide();
        }
        fieldContainer.onmouseout = () => {
            cycleBtn.hide();
            spacer.show();
        }
    }
    cycleBtn.onclick = async () => {
        managedField.save(getNextOption(managedField))
        if (!attrs?.options?.alwaysOn) {
            cycleBtn.hide();
            spacer.show();
        }
    }

}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    const iconName = getIcon(mapFieldType(field.type));
    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        const fieldVM = fieldValueManager<Options>(plugin, field.id, field.fileClassName, file, eF, indexedPath)
        if (fieldVM) fieldVM.save(getNextOption(fieldVM))
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `cycle_${field.name}`,
            actionLabel: `<span>Cycle <b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        })
    } else if (isFieldActions(location)) {
        location.addOption(iconName, action, `Cycle ${name}`);
    };
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractList.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return getOptionsList(managedField).includes(managedField.value)
}

//#region utils

export function getOptionsList(managedField: IFieldManager<Target, Options>): string[] {
    return managedField.options.allowNull ? ["", ...baseGetOptionsList(managedField)] : baseGetOptionsList(managedField);
}

export function getNextOption(managedField: IFieldManager<Target, Options>): string {
    let nextOption: string;
    const values = getOptionsList(managedField);
    const value = !managedField.value ? "" : managedField.value.toString()
    if (values.indexOf(value) === -1) {
        nextOption = values[0] || ""
    } else {
        nextOption = values[(values.indexOf(value) + 1) % values.length]
    }
    return nextOption
}

//#endregion