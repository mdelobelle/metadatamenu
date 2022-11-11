import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, Modal, setIcon, TextAreaComponent, TextComponent, TFile } from "obsidian";
import { insertValues } from "src/commands/insertValues";
import { replaceValues } from "src/commands/replaceValues";
import Field from "src/fields/Field";

export default class InputModal extends Modal {
    private templateValues: Record<string, string> = {};
    private renderedValue: TextAreaComponent;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private value: string,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
    ) { super(plugin.app); };

    onOpen() {
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
            this.buildSaveBtn(this.contentEl.createDiv({ cls: "footer-actions" }));
        } else {
            this.buildInputEl(this.contentEl.createDiv({ cls: "field-container" }));
        }
        this.containerEl.addClass("metadata-menu")
    };

    private renderValue() {
        let renderedString = this.field.options.template.slice()
        Object.keys(this.templateValues).forEach(k => {
            const fieldRegex = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[^\\}]*)?\\}\\}`, "u")
            renderedString = renderedString.replace(fieldRegex, this.templateValues[k])
        })

        this.renderedValue.setValue(renderedString)
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

    private buildSaveBtn(fieldContainer: HTMLDivElement) {
        fieldContainer.createDiv({ cls: "spacer" })
        const saveBtn = new ButtonComponent(fieldContainer);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(async () => {
            let inputValue = this.renderedValue.getValue();
            if (this.lineNumber == -1) {
                await this.plugin.fileTaskManager
                    .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, inputValue) });
            } else {
                await this.plugin.fileTaskManager
                    .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, inputValue, this.lineNumber, this.inFrontmatter, this.after, this.asList, this.asComment) });
            };
            this.close();
        })
    }

    private buildInputEl(container: HTMLDivElement): void {
        const inputEl = new TextComponent(container);
        inputEl.inputEl.focus();
        inputEl.inputEl.addClass("full-width");
        inputEl.setValue(`${this.value}`);
        const saveBtn = new ButtonComponent(container);
        saveBtn.setIcon("checkmark");
        saveBtn.onClick(async () => {
            let inputValue = inputEl.getValue();
            if (this.lineNumber == -1) {
                await this.plugin.fileTaskManager
                    .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, inputValue) });
            } else {
                await this.plugin.fileTaskManager
                    .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, inputValue, this.lineNumber, this.inFrontmatter, this.after, this.asList, this.asComment) });
            };
            this.close();
        })
    };
};