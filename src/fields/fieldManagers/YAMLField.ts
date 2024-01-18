import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import RawObjectField from "../abstractFieldManagers/AbstractRawObjectField";
import * as yamlMode from '@codemirror/legacy-modes/mode/yaml';
import { Diagnostic, linter } from "@codemirror/lint";
import { stringify, parse } from "yaml";
import { TFile } from "obsidian";

export default class YAMLField extends RawObjectField {
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.YAML)
    }

    public dumpValue(value: any): string {
        return `${stringify(value, { lineWidth: 50 }) || ""}`
    }

    public loadValue(value: any): any {
        try {
            //handle inline fields where YAML are not parsed by dataview
            return parse(value.split("\\n").join("\n") || null)
        } catch (e) {
            return value
        }
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        const valueString = this.dumpValue(value)
        container.setText(`${valueString.slice(0, 50)}${valueString.length > 50 ? "..." : ""}`)
    }

    public getExtraExtensions() {
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
}
