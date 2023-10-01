import MetadataMenu from "main";
import { DropdownComponent, TextAreaComponent, TextComponent, TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";
import { Note } from "src/note/note";
import { cleanActions } from "src/utils/modals";
import BaseModal from "../baseModal";

export default class InputModal extends BaseModal {
    private templateValues: Record<string, string> = {};
    private renderedValue: TextAreaComponent;
    private newValue: string;
    private value: string;

    constructor(
        public plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private note: Note | undefined,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
    ) {
        super(plugin);
        this.value = this.note?.getExistingFieldForIndexedPath(this.indexedPath)?.value || ""
    };

    onOpen() {
        super.onOpen()
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
                        const options = JSON.parse(optionsString);
                        this.buildTemplateSelectItem(this.contentEl.createDiv({ cls: "field-container" }), name, options);
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
        this.buildSaveBtn(this.contentEl.createDiv({ cls: "footer-actions" }));
        this.containerEl.addClass("metadata-menu")
    };

    private renderValue() {
        let renderedString = this.field.options.template.slice()
        Object.keys(this.templateValues).forEach(k => {
            const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
            renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
        })

        this.renderedValue.setValue(renderedString)
        this.newValue = renderedString
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
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: this.newValue } }], this.file, this.lineNumber, this.after, this.asList, this.asComment)
        this.close();
    }
};