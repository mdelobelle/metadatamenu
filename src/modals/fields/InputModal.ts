import MetadataMenu from "main";
import { DropdownComponent, Notice, TextAreaComponent, TextComponent, TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import { cleanActions } from "src/utils/modals";
import BaseModal from "../baseFieldModals/BaseModal";
import ObjectListModal from "./ObjectListModal";
import ObjectModal from "./ObjectModal";

export default class InputModal extends BaseModal {
    private templateValues: Record<string, string> = {};
    private renderedValue: TextAreaComponent;
    private newValue: string;
    private value: string;

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        private field: Field,
        private eF?: ExistingField,
        public indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin, file, previousModal, indexedPath);
        this.value = this.eF?.value || ""
        if (this.field.options.template) {
            const templateFieldRegex = new RegExp(`\\{\\{(?<field>[^\\}]+?)\\}\\}`, "gu");
            const tF = this.field.options.template.matchAll(templateFieldRegex)
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
                                `in <${this.field.name}> ${this.field.fileClassName ? this.field.fileClassName : "Metadata Menu"} settings`
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
        //this.buildSaveBtn(this.contentEl.createDiv({ cls: "footer-actions" }));
        this.buildFooterBtn()
        this.containerEl.addClass("metadata-menu")
    };

    onOpen() {
        super.onOpen()
    };

    private renderValue() {
        let renderedString = this.field.options.template.slice()
        Object.keys(this.templateValues).forEach(k => {
            const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
            renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
        })

        this.renderedValue.setValue(renderedString.replaceAll("\n", ", "))
        this.newValue = renderedString.replaceAll("\n", ", ")
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
        this.renderedValue.inputEl.addClass("full-width")
        this.renderedValue.inputEl.rows = 3;
        this.renderedValue.setValue(this.value);
        this.renderedValue.onChange(value => this.newValue = value)
    }

    private buildInputEl(container: HTMLDivElement): void {
        const inputEl = new TextAreaComponent(container);
        inputEl.inputEl.rows = 3;
        inputEl.inputEl.focus();
        inputEl.inputEl.addClass("full-width");
        inputEl.setValue(`${this.value || ""}`);
        inputEl.onChange(value => this.newValue = value)
    };

    public async save(): Promise<void> {
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: this.newValue } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.saved = true
        if (this.previousModal) await this.goToPreviousModal()
        this.close()
    }


};