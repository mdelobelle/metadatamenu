import { App, Setting, TFile } from "obsidian";
import MetadataMenu from "main";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FileClassQuerySettingsModal from "./FileClassQuerySettingModal";

export default class FileClassQuerySetting extends Setting {
    public fileClassQuery: FileClassQuery;
    private app: App;
    private plugin: MetadataMenu;
    private containerEl: HTMLElement;

    constructor(containerEl: HTMLElement, property: FileClassQuery, app: App, plugin: MetadataMenu) {
        super(containerEl);
        this.containerEl = containerEl;
        this.fileClassQuery = property;
        this.app = app;
        this.plugin = plugin;
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();
    };

    public setTextContentWithname(): void {

        this.infoEl.textContent = "";
        this.infoEl.addClass("metadata-menu-setting-item")
        const fileClassQueryContainer = this.infoEl.createDiv();

        const nameContainer = fileClassQueryContainer.createEl("div", "metadata-menu-setting-item-name")
        nameContainer.innerHTML = `<strong>${this.fileClassQuery.name}</strong>`

        const fileClassNameContainer = fileClassQueryContainer.createEl("div")
        fileClassNameContainer.innerHTML = `<span>FileClass</span> : ${this.fileClassQuery.fileClassName}`

        const queryContainer = fileClassQueryContainer.createEl("div")
        queryContainer.innerHTML = `<span>Query</span> : ${this.fileClassQuery.query}`

    };

    private addEditButton(): void {
        this.addButton((b) => {
            b.setIcon("pencil")
                .setTooltip("Edit")
                .onClick(() => {
                    let modal = new FileClassQuerySettingsModal(this.app, this.plugin, this.containerEl, this, this.fileClassQuery);
                    modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingFileClassQuery = this.plugin.initialFileClassQueries.filter(p => p.id == this.fileClassQuery.id)[0];
                    if (currentExistingFileClassQuery) {
                        this.plugin.initialFileClassQueries.remove(currentExistingFileClassQuery);
                    };
                    this.settingEl.parentElement?.removeChild(this.settingEl);
                    this.plugin.saveSettings();
                });
        });
    };
};