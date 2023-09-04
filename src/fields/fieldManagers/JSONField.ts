import { json } from "@codemirror/lang-json";
import { Diagnostic, linter } from "@codemirror/lint";
import MetadataMenu from "main";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import ObjectField from "./AbstractObjectField";

export default class JSONField extends ObjectField {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.JSON)
    }

    public dumpValue(value: string) {
        return `${JSON.stringify(value, null, "  ") || ""}`
    }

    public loadValue(value: any): any {
        try {
            //handle inline fields where JSON are not parsed by dataview
            return JSON.parse(value)
        } catch (e) {
            return value;
        }
    }

    public getExtraExtensions() {

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
}