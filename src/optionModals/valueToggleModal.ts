import { App, Modal, ToggleComponent, TFile, ButtonComponent, ExtraButtonComponent } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";

export default class valueToggleModal extends Modal {

    private file: TFile;
    private name: string;
    private value: boolean;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private top: boolean;

    constructor(app: App, file: TFile, name: string, value: boolean, lineNumber: number = -1, inFrontMatter: boolean = false, top: boolean = false) {
        super(app);
        this.app = app;
        this.file = file;
        this.name = name;
        this.value = value;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.top = top;
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv({
            cls: "metadata-menu-toggler"
        });
        this.buildToggleEl(inputDiv);
    };

    private buildToggleEl(inputDiv: HTMLDivElement): void {
        const toggleEl = new ToggleComponent(inputDiv);
        toggleEl.setValue(this.value);
        toggleEl.onChange(value => { this.value = value })
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
            const value = this.value.toString()
            if (this.lineNumber == -1) {
                replaceValues(this.app, this.file, this.name, value);
            } else {
                const result = await this.app.vault.read(this.file)
                let newContent: string[] = [];
                if (this.top) {
                    newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${value}`);
                    result.split("\n").forEach((line, _lineNumber) => newContent.push(line));
                } else {
                    result.split("\n").forEach((line, _lineNumber) => {
                        newContent.push(line);
                        if (_lineNumber == this.lineNumber) {
                            newContent.push(`${this.name}${this.inFrontmatter ? ":" : "::"} ${value}`);
                        };
                    });
                };

                this.app.vault.modify(this.file, newContent.join('\n'));
                this.close();
            };
            this.close();
        });
    };
};