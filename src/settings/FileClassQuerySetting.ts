import { Setting } from "obsidian";
import MetadataMenu from "main";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FileClassQuerySettingsModal from "./FileClassQuerySettingModal";

export default class FileClassQuerySetting extends Setting {
    public fileClassQuery: FileClassQuery;

    constructor(
        private containerEl: HTMLElement,
        property: FileClassQuery,
        private plugin: MetadataMenu
    ) {
        super(containerEl);
        this.fileClassQuery = property;
        this.setTextContentWithname();
        this.addEditButton();
        this.addDeleteButton();
        this.addMoveUpButton();
        this.settingEl.addClass("no-border")
    };

    public setTextContentWithname(): void {

        this.infoEl.textContent = "";
        this.infoEl.addClass("setting-item")
        const fileClassQueryContainer = this.infoEl.createDiv();

        const nameContainer = fileClassQueryContainer.createEl("div", "name")
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
                    let modal = new FileClassQuerySettingsModal(this.plugin, this.containerEl, this, this.fileClassQuery);
                    modal.open();
                });
        });
    };

    private addDeleteButton(): void {
        this.addButton((b) => {
            b.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    const currentExistingFileClassQuery = this.plugin.initialFileClassQueries.find(p => p.id == this.fileClassQuery.id);
                    if (currentExistingFileClassQuery) {
                        this.plugin.initialFileClassQueries.remove(currentExistingFileClassQuery);
                    };
                    this.settingEl.parentElement?.removeChild(this.settingEl);
                    this.plugin.saveSettings();
                });
        });
    };

    private addMoveUpButton(): void {
        this.addButton((b) => {
            b.setIcon("up-chevron-glyph")
                .setTooltip("Move up (lower priority)")
                .onClick(() => {
                    const currentFileClassQueryIndex = this.plugin.initialFileClassQueries.map(fcq => fcq.id).indexOf(this.fileClassQuery.id);
                    if (currentFileClassQueryIndex > 0) {
                        this.containerEl.insertBefore(this.settingEl, this.settingEl.previousElementSibling);
                        this.plugin.initialFileClassQueries.splice(currentFileClassQueryIndex, 1);
                        this.plugin.initialFileClassQueries.splice(currentFileClassQueryIndex - 1, 0, this.fileClassQuery);
                        this.plugin.saveSettings();
                    }
                })
        })
    }
};