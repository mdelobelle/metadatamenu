import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import ObjectField from "./AbstractObjectField";
import * as yamlMode from '@codemirror/legacy-modes/mode/yaml';
import { Diagnostic, linter } from "@codemirror/lint";
import { stringify, parse } from "yaml";

export default class YAMLField extends ObjectField {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.YAML)
    }

    public dumpValue(value: any): string {
        return `${stringify(value, { lineWidth: 50 }) || ""}`
    }

    public loadValue(value: any): any {
        try {
            //handle inline fields where YAML are not parsed by dataview
            return parse(value.split("\\n").join("\n"))
        } catch (e) {
            return value
        }
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
