import { App, Modal, ToggleComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";

export default class valueToggleModal extends Modal {

    private file: TFile;
    private name: string;
    private value: boolean;

    constructor(app: App, file: TFile, name: string, value: boolean) {
        super(app);
        this.app = app;
        this.file = file;
        this.name = name;
        this.value = value;
    };

    onOpen() {
        const inputDiv = this.contentEl.createDiv({
            cls: "metadata-menu-toggler"
        });
        this.buildInputEl(inputDiv);
    };

    private buildInputEl(inputDiv: HTMLDivElement): void {
        const inputEl = new ToggleComponent(inputDiv);
        inputEl.setValue(this.value);
        inputEl.onChange(v => {
            replaceValues(this.app, this.file, this.name, v ? "true" : "false");
        });
    };
};