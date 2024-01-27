import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import MetadataMenu from "main";
import * as yamlMode from '@codemirror/legacy-modes/mode/yaml';
import * as AbstractRaw from "./abstractModels/AbstractRaw"
import { Diagnostic, linter } from "@codemirror/lint";
import { stringify, parse } from "yaml";
import { TFile, setIcon } from "obsidian";
import { IFieldBase } from "../base/BaseField";
import { ISettingsModal } from "../base/BaseSetting";
import { Constructor } from "src/typings/types";
import { ActionLocation, IField, IFieldManager, Target } from "../Field";
import { Extension } from "@codemirror/state"
import { getIcon } from "../Fields";

export class Base implements IFieldBase {
    type = <const>"YAML"
    tagName = "yaml"
    icon = "file-json-2"
    tooltip = "Accepts a YAML object"
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
            return dumpValue(value)
        }

        public getExtraExtensions(): Array<LanguageSupport | Extension> {
            const yaml = new LanguageSupport(StreamLanguage.define(yamlMode.yaml));

            const yamlLinter = linter(view => {
                let diagnostics: Diagnostic[] = [];
                try {
                    parse(view.state.doc.toString())
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
            return [yaml, yamlLinter]
        }
        public loadValue(value: any): any {
            try {
                //handle inline fields where YAML are not parsed by dataview
                return parse(value.split("\\n").join("\n") || null)
            } catch (e) {
                return value
            }
        }
    }
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    const valueString = `${stringify(managedField.value, { lineWidth: 50 }) || ""}`
    container.setText(`${valueString.slice(0, 50)}${valueString.length > 50 ? "..." : ""}`)
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
        parse(managedField.value)
        return true
    } catch (e) {
        return false
    }
}

export function dumpValue(value: any): string {
    return `${stringify(value, { lineWidth: 50 }) || ""}`
}