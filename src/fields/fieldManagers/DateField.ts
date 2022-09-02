import MetadataMenu from "main";
import { App, Menu, moment, setIcon, TextComponent, TFile, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import DateModal from "src/optionModals/fields/DateModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";

export default class DateField extends FieldManager {

    private dateValidatorField: HTMLDivElement
    public defaultDateFormat: string = "YYYY-MM-DD"

    constructor(field: Field) {
        super(field, FieldType.Date)
    }

    addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new DateModal(app, file, this.field, value);
        modal.titleEl.setText(`Change date for <${name}>`);
        if (DateField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Date]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            })
        } else if (DateField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Date]
            })
        };
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new DateModal(app, file, this.field, "", lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Enter date for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDateContainer(parentContainer: HTMLDivElement): void {
        if (!this.field.options.dateFormat) this.field.options.dateFormat = this.defaultDateFormat
        if (!this.field.options.defaultInsertAsLink) this.field.options.defaultInsertAsLink = "false"
        const dateFormatContainer = parentContainer.createDiv();
        dateFormatContainer.createEl("span", { text: "Date format", cls: 'metadata-menu-field-option' })
        const dateFormatInput = new TextComponent(dateFormatContainer)
        dateFormatInput.setValue(this.field.options.dateFormat)
        const dateExample = dateFormatContainer.createEl("span", { text: "", cls: 'metadata-menu-field-option' })
        dateExample.setText(`example: ${moment().format(dateFormatInput.getValue())}`)
        dateFormatInput.onChange((value: string) => {
            this.field.options.dateFormat = value
            dateExample.setText(`example: ${moment().format(value)}`);
        });

        const dateLinkPathContainer = parentContainer.createDiv();
        dateLinkPathContainer.createEl("span", { text: "Link path (optional)", cls: 'metadata-menu-field-option' })
        const dateLinkPathInput = new TextComponent(dateLinkPathContainer)
        dateLinkPathInput.setValue(this.field.options.linkPath)
        dateLinkPathInput.onChange((value: string) => {
            this.field.options.linkPath = value.endsWith("/") ? value : value + "/";
        });

        const defaultInsertAsLinkContainer = parentContainer.createDiv();
        defaultInsertAsLinkContainer.createEl("span", { text: "Insert as link by default", cls: 'metadata-menu-field-option' });
        const defaultInsertAsLink = new ToggleComponent(defaultInsertAsLinkContainer);
        defaultInsertAsLink.setValue(DateField.stringToBoolean(this.field.options.defaultInsertAsLink))
        defaultInsertAsLink.onChange((value: boolean) => {
            this.field.options.defaultInsertAsLink = value.toString();
        });
    }

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.dateValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" });
        this.createDateContainer(this.dateValidatorField);
        this.dateValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }
    ): Promise<void> {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        const dateBtn = document.createElement("button")
        setIcon(dateBtn, FieldIcon[FieldType.Date])
        dateBtn.addClass("metadata-menu-dv-field-button")
        /* end spacer */
        const spacer = document.createElement("div")
        spacer.setAttr("class", "metadata-menu-dv-field-spacer")

        const file = app.vault.getAbstractFileByPath(p["file"]["path"])
        let fieldModal: DateModal;
        if (file instanceof TFile && file.extension == "md") {
            if (p[this.field.name] && p[this.field.name].hasOwnProperty("path")) {
                const dateFile = app.vault.getAbstractFileByPath(p[this.field.name])
                if (dateFile instanceof TFile && dateFile.extension == "md") {
                    fieldModal = new DateModal(app, file, this.field, dateFile.name)
                } else {
                    fieldModal = new DateModal(app, file, this.field, p[this.field.name].path.split("/").last().replace(".md", ""))
                }
            } else if (p[this.field.name]) {
                fieldModal = new DateModal(app, file, this.field, p[this.field.name])
            } else {
                fieldModal = new DateModal(app, file, this.field, "")
            }
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
        fieldModal.onClose = () => {
            fieldModal.contentEl.innerHTML = "";
        }
        dateBtn.onclick = () => {
            fieldModal.open()
        }

        if (!attrs?.options?.alwaysOn) {
            dateBtn.hide()
            spacer.show()
            fieldContainer.onmouseover = () => {
                dateBtn.show()
                spacer.hide()
            }
            fieldContainer.onmouseout = () => {
                dateBtn.hide()
                spacer.show()
            }
        }

        /* initial state */
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(dateBtn);
        fieldContainer.appendChild(spacer);
    }

    getOptionsStr(): string {
        return this.field.options.dateFormat;
    }

    validateOptions(): boolean {
        return true;
    }

    async validateValue(value: string): Promise<boolean> {
        return moment(value.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(), this.field.options.dateFormat).isValid()
    }
}