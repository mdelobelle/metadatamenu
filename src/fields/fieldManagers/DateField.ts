import MetadataMenu from "main";
import { Menu, moment, setIcon, TextComponent, TFile, ToggleComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import DateModal from "src/optionModals/fields/DateModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import { getField } from "src/commands/getField";
import { FileClass } from "src/fileClass/fileClass";
import CycleField from "./CycleField";
import { FieldManager as FM } from "src/types/fieldTypes";
import { replaceValues } from "src/commands/replaceValues";
import { Link } from "src/types/dataviewTypes";

export default class DateField extends FieldManager {

    private dateValidatorField: HTMLDivElement
    public defaultDateFormat: string = "YYYY-MM-DD"
    private shiftBtn: HTMLButtonElement

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Date)
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new DateModal(this.plugin, file, this.field, value);
        modal.titleEl.setText(`Change date for <${name}>`);
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api;
        if (DateField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Date]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            })
            if (this.field.options.dateShiftInterval || this.field.options.nextShiftIntervalField && dvApi) {
                const p = dvApi.page(file.path)
                const fieldManager: DateField = new FM[this.field.type](this.plugin, this.field);
                const [currentShift, nextIntervalField, nextShift]: [string | undefined, Field | undefined, string | undefined] = fieldManager.shiftDuration(file);
                location.addItem((item) => {
                    item.setTitle(`Shift <${name}> ${currentShift} ahead`);
                    item.setIcon("skip-forward");
                    item.onClick(() => { this.shiftDate(dvApi, p, file) });
                    item.setSection("metadata-menu.fields");
                })
            }
        } else if (DateField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Date]
            })
            if (this.field.options.dateShiftInterval || this.field.options.nextShiftIntervalField && dvApi) {
                const p = dvApi.page(file.path)
                const fieldManager: DateField = new FM[this.field.type](this.plugin, this.field);
                const [currentShift, nextIntervalField, nextShift]: [string | undefined, Field | undefined, string | undefined] = fieldManager.shiftDuration(file);
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Shift <b>${name}</b> ${currentShift} ahead</span>`,
                    action: () => this.shiftDate(dvApi, p, file),
                    icon: FieldIcon[FieldType.Date]
                })
            }
        };
    }

    public createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new DateModal(this.plugin, file, this.field, value || "", lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Enter date for ${selectedFieldName}`);
        fieldModal.open();
    }

    private createDateContainer(parentContainer: HTMLDivElement): void {
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

        // insert as link toggler
        const defaultInsertAsLinkContainer = parentContainer.createDiv();
        defaultInsertAsLinkContainer.createEl("span", { text: "Insert as link by default", cls: 'metadata-menu-field-option' });
        const defaultInsertAsLink = new ToggleComponent(defaultInsertAsLinkContainer);
        defaultInsertAsLink.setValue(DateField.stringToBoolean(this.field.options.defaultInsertAsLink))
        defaultInsertAsLink.onChange((value: boolean) => {
            this.field.options.defaultInsertAsLink = value.toString();
        });

        //folder path for link
        const dateLinkPathContainer = parentContainer.createDiv();
        dateLinkPathContainer.createEl("span", { text: "Link path (optional)", cls: 'metadata-menu-field-option' })
        const dateLinkPathInput = new TextComponent(dateLinkPathContainer)
        dateLinkPathInput.setValue(this.field.options.linkPath)
        dateLinkPathInput.onChange((value: string) => {
            this.field.options.linkPath = value.endsWith("/") ? value : value + "/";
        });

        // shift interval (should be a number or a luxon humanized duration (requires dataview) -> to include in validation)
        const dateShiftIntervalContainer = parentContainer.createDiv();
        dateShiftIntervalContainer.createEl("span", { text: "Define a shift interval", cls: 'metadata-menu-field-option' });
        const dateShiftInterval = new TextComponent(dateShiftIntervalContainer);
        dateShiftInterval.setPlaceholder("ex: 1 month 2 days")
        dateShiftInterval.setValue(this.field.options.dateShiftInterval)
        dateShiftInterval.onChange((value: string) => {
            if (!value) {
                delete this.field.options.dateShiftInterval;
            } else {
                this.field.options.dateShiftInterval = value.toString();
            }
        });

        // intervals cycle field name
        const nextShiftIntervalFieldContainer = parentContainer.createDiv();
        nextShiftIntervalFieldContainer.createEl("span", {
            text: "Field containing shift intervals (has the priority over the Shift Interval above)",
            cls: 'metadata-menu-field-option'
        });
        const nextShiftIntervalField = new TextComponent(nextShiftIntervalFieldContainer);
        nextShiftIntervalField.setValue(this.field.options.nextShiftIntervalField)
        nextShiftIntervalField.onChange((value: string) => {
            if (!value) {
                delete this.field.options.nextShiftIntervalField;
            } else {
                this.field.options.nextShiftIntervalField = value.toString();
            }
        });

    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        this.dateValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" });
        this.createDateContainer(this.dateValidatorField);
        this.dateValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    public async shiftDate(dv: any, p: any, file: TFile): Promise<void> {
        const { dateFormat, defaultInsertAsLink, linkPath } = this.field.options
        const fieldManager: DateField = new FM[this.field.type](this.plugin, this.field);
        const [currentShift, nextIntervalField, nextShift]: [string | undefined, Field | undefined, string | undefined] = fieldManager.shiftDuration(file);
        const dvDate = p[this.field.name]
        //dataview is converting dates to links or datetimes, let's normalize
        const currentDateValue = dv.value.isLink(dvDate) ? dvDate.path.split("/").last() : dv.value.isDate(dvDate) ? moment(dvDate.toJSDate()).format(dateFormat) : dvDate
        const currentDvDate = dv.date(moment(currentDateValue, dateFormat).toISOString());
        const newDate = currentDvDate.plus(dv.duration(currentShift || "1 day"));
        const newValue = moment(newDate.toString()).format(dateFormat)
        if (nextIntervalField && nextShift) {
            await this.plugin.fileTaskManager
                .pushTask(() => { replaceValues(this.plugin, file.path, nextIntervalField.name, nextShift) });
        }
        const linkFile = this.plugin.app.metadataCache.getFirstLinkpathDest(linkPath || "" + newValue.format(dateFormat), file.path)
        const formattedValue = DateField.stringToBoolean(defaultInsertAsLink) ? `[[${linkPath || ""}${newValue}${linkFile ? "|" + linkFile.basename : ""}]]` : newValue
        await this.plugin.fileTaskManager
            .pushTask(() => { replaceValues(this.plugin, file.path, this.field.name, formattedValue) });

    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }
    ): void {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        const dateBtn = document.createElement("button")
        setIcon(dateBtn, FieldIcon[FieldType.Date])
        dateBtn.addClass("metadata-menu-dv-field-button")
        /* end spacer */
        const spacer = document.createElement("div")
        if (this.field.options.dateShiftInterval || this.field.options.nextShiftIntervalField) {
            this.shiftBtn = document.createElement("button")
            setIcon(this.shiftBtn, "skip-forward")
            this.shiftBtn.addClass("metadata-menu-dv-field-button")
            spacer.setAttr("class", "metadata-menu-dv-field-double-spacer")

        } else {
            spacer.setAttr("class", "metadata-menu-dv-field-spacer")
        }

        const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
        let fieldModal: DateModal;
        if (file instanceof TFile && file.extension == "md") {
            if (p[this.field.name] && p[this.field.name].hasOwnProperty("path")) {
                const dateFile = this.plugin.app.vault.getAbstractFileByPath(p[this.field.name])
                if (dateFile instanceof TFile && dateFile.extension == "md") {
                    fieldModal = new DateModal(this.plugin, file, this.field, dateFile.name)
                } else {
                    fieldModal = new DateModal(this.plugin, file, this.field, p[this.field.name].path.split("/").last().replace(".md", ""))
                }
            } else if (p[this.field.name]) {
                fieldModal = new DateModal(this.plugin, file, this.field, p[this.field.name])
            } else {
                fieldModal = new DateModal(this.plugin, file, this.field, "")
            }
            if (this.shiftBtn) this.shiftBtn.onclick = () => { this.shiftDate(dv, p, file) }
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
        fieldModal.onClose = () => { fieldModal.contentEl.innerHTML = ""; }
        dateBtn.onclick = () => { fieldModal.open() }

        if (!attrs?.options?.alwaysOn) {
            dateBtn.hide()
            if (this.shiftBtn) this.shiftBtn.hide()
            spacer.show()
            fieldContainer.onmouseover = () => {
                dateBtn.show()
                if (this.shiftBtn) this.shiftBtn.show()
                spacer.hide()
            }
            fieldContainer.onmouseout = () => {
                dateBtn.hide()
                if (this.shiftBtn) this.shiftBtn.hide()
                spacer.show()
            }
        }

        /* initial state */
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(dateBtn);
        if (this.shiftBtn) fieldContainer.appendChild(this.shiftBtn);
        fieldContainer.appendChild(spacer);
    }

    public getOptionsStr(): string {
        return this.field.options.dateFormat;
    }

    public validateOptions(): boolean {
        return true;
    }

    public validateValue(value: string): boolean {
        if (typeof (value) == 'string') {
            return moment(value.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(), this.field.options.dateFormat).isValid()
        } else {
            return moment((value as { path: string }).path.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(), this.field.options.dateFormat).isValid()
        }

    }

    public shiftDuration(file: TFile): [string | undefined, Field | undefined, string | undefined] {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            const interval = this.field.options.dateShiftInterval

            const cycleIntervalField = this.field.options.nextShiftIntervalField
            let fileClass: FileClass | undefined;
            const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter
            if (frontmatter) {
                const fileClassName = frontmatter[this.plugin.settings.fileClassAlias]
                let fileClass: FileClass | undefined
                try {
                    fileClass = fileClassName ? FileClass.createFileClass(this.plugin, fileClassName) : undefined
                } catch {
                    fileClass = undefined
                }
            }
            const cycle = getField(this.plugin, cycleIntervalField, fileClass)
            if (cycle) {
                //cycle field exists
                const cycleManager: CycleField = new FM[cycle.type](this.plugin, cycle)
                const options = Object.entries(cycleManager.field.options);
                const currentValue = dvApi.page(file.path)[cycle.name]

                if (currentValue) {
                    //current value is not null
                    const currentValueString = options
                        .filter(o => dvApi.duration(o[1]) !== null)
                        .find(o => dvApi.duration(o[1]).equals(currentValue))
                    if (currentValueString) {
                        //current value has a match in cycle options
                        const nextValue = cycleManager.nextOption(currentValueString[1])
                        return [currentValueString[1], cycle, nextValue]
                    }
                }
                //current value is not found or : fall back on first value
                return [options[0][1], cycle, options[1][1] || options[0][1]]
            } else if (interval && dvApi.duration(interval)) {
                //no cycle field: fall back on interval if exists
                return [interval, undefined, undefined]
            }
        }
        // dv not available => return undefined cycle values
        return [undefined, undefined, undefined]
    }
}