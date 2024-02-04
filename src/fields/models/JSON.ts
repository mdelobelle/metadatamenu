import MetadataMenu from "main";
import * as AbstractRaw from "./abstractModels/AbstractRaw"
import { json } from "@codemirror/lang-json";
import { Diagnostic, linter } from "@codemirror/lint";
import { TFile, setIcon } from "obsidian";
import { IFieldBase } from "../base/BaseField";
import { Constructor } from "src/typings/types";
import { ISettingsModal } from "../base/BaseSetting";
import { LanguageSupport } from "@codemirror/language";
import { ActionLocation, IField, IFieldManager, Target } from "../Field";
import { Extension } from "@codemirror/state"
import { getIcon } from "../Fields";


export class Base implements IFieldBase {
    type = <const>"JSON"
    tagName = "json"
    icon = "file-json-2"
    tooltip = "Accepts a JSON object"
    colorClass = "file"
}

export interface Options extends AbstractRaw.Options { }

export interface DefaultedOptions extends AbstractRaw.DefaultedOptions { }

export const DefaultOptions: AbstractRaw.DefaultedOptions = AbstractRaw.DefaultOptions

export function settingsModal(Base: Constructor<ISettingsModal<AbstractRaw.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    return AbstractRaw.settingsModal(Base)
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractRaw.Modal<Target>> {
    const base = AbstractRaw.valueModal(managedField, plugin)
    return class ValueModal extends base {

        public dumpValue(value: any): string {
            return `${JSON.stringify(value, null, "  ") || ""}`
        }

        public getExtraExtensions(): Array<LanguageSupport | Extension> {
            const jsonLinter = linter(view => {
                let diagnostics: Diagnostic[] = [];
                try {
                    JSON.parse(view.state.doc.toString())
                }
                catch (e) {
                    var loc = e.mark;
                    var from = loc ? Math.min(loc.position, view.state.doc.length) : 0;
                    var to = from;
                    var severity: "error" | "hint" | "info" | "warning" = "error";
                    diagnostics.push({ from: from, to: to, message: e.message, severity: severity });
                }
                return diagnostics
            })
            return [json(), jsonLinter]
        }
        public loadValue(value: any): any {
            try {
                //handle inline fields where JSON are not parsed by dataview
                return JSON.parse(value || "{}")
            } catch (e) {
                return value;
            }
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    const valueString = `${JSON.stringify(managedField.value, null, "  ") || ""}`
    return `${valueString.slice(0, 50)}${valueString.length > 50 ? "..." : ""}`
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    container.setText(valueString(managedField))
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    const fieldValue = dv.el('span', p[managedField.name] || "", attrs)
    fieldContainer.appendChild(fieldValue)
    /* end spacer */
    /* button to display input */
    const editBtn = fieldContainer.createEl("button");
    /* end spacer */
    const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
    if (attrs.options?.alwaysOn) spacer.hide();
    setIcon(editBtn, getIcon(managedField.type));
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
        fieldValue.hide();
        editBtn.hide();
        spacer.hide();
    }
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractRaw.actions(plugin, field, file, location, indexedPath)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    try {
        JSON.parse(managedField.value)
        return true
    } catch (e) {
        return false
    }
}