import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, moment, TFile, ToggleComponent, DropdownComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import DateModal from "src/modals/fields/DateModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import CycleField from "../fieldManagers/CycleField";
import { FieldManager as FM } from "src/types/fieldTypes";
import { FieldOptions } from "src/components/FieldsModal";
import { postValues } from "src/commands/postValues";
import { getLink } from "src/utils/parser";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
import { fieldValueManager } from "../Field";
import { getActions, mapFieldType } from "../Fields";



export default abstract class AbstractDateBasedField extends FieldManager {

    public defaultDateFormat: string = "YYYY-MM-DD"
    private shiftBtn: HTMLButtonElement

    constructor(plugin: MetadataMenu, field: Field, type: FieldType) {
        super(plugin, field, type)
        this.showModalOption = false;
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        // const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        // const modal = new DateModal(this.plugin, file, this.field, eF, indexedPath);
        // modal.titleEl.setText(`Change date for <${this.field.name}>`);
        // modal.open()
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        fieldValueManager(this.plugin, this.field.id, this.field.fileClassName, file, eF, indexedPath)?.openModal()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        return getActions(mapFieldType(this.field.type))(this.plugin, this.field, file, location, indexedPath)
        // const name = this.field.name
        // const dateIconName = FieldIcon[this.field.type];
        // const dateModalAction = async () => await this.buildAndOpenModal(file, indexedPath);
        // const shiftDateAction = async () => await this.shiftDate(file, indexedPath);
        // const clearDateAction = async () => await this.clearDate(file, indexedPath)
        // if (AbstractDateBasedField.isSuggest(location)) {
        //     location.options.push({
        //         id: `update_${name}`,
        //         actionLabel: `<span>Update <b>${name}</b></span>`,
        //         action: dateModalAction,
        //         icon: dateIconName
        //     })
        //     if (this.field.options.dateShiftInterval || this.field.options.nextShiftIntervalField) {
        //         location.options.push({
        //             id: `update_${name}`,
        //             actionLabel: `<span>Shift <b>${name}</b> ahead</span>`,
        //             action: shiftDateAction,
        //             icon: "skip-forward"
        //         })
        //     }
        //     location.options.push({
        //         id: `clear_${name}`,
        //         actionLabel: `<span>Clear <b>${name}</b></span>`,
        //         action: clearDateAction,
        //         icon: "eraser"
        //     })
        // } else if (AbstractDateBasedField.isFieldOptions(location)) {
        //     location.addOption("skip-forward", shiftDateAction, `Shift ${name} ahead`);
        //     location.addOption(dateIconName, dateModalAction, `Set ${name}'s date`);
        // };
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): void {
        const fieldModal = new DateModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        fieldModal.titleEl.setText(`Enter date for ${selectedFieldName}`);
        fieldModal.open();
    }

    // OK
    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        if (!this.field.options.dateFormat) this.field.options.dateFormat = this.defaultDateFormat
        if (!this.field.options.defaultInsertAsLink) this.field.options.defaultInsertAsLink = "false"
        const dateFormatContainer = container.createDiv({ cls: "field-container" });
        dateFormatContainer.createEl("span", { text: "Date format", cls: 'label' })
        const dateExample = dateFormatContainer.createEl("span", { cls: 'more-info' })
        const dateFormatInput = new TextComponent(dateFormatContainer)
        dateFormatInput.inputEl.addClass("with-label")
        dateFormatInput.inputEl.addClass("full-width")
        dateFormatInput.setValue(this.field.options.dateFormat)
        dateExample.setText(`${moment().format(dateFormatInput.getValue())}`)
        dateFormatInput.onChange((value: string) => {
            this.field.options.dateFormat = value
            dateExample.setText(`${moment().format(value)}`);
        });

        // insert as link toggler
        const defaultInsertAsLinkContainer = container.createDiv({ cls: "field-container" });
        defaultInsertAsLinkContainer.createEl("span", { text: "Insert as link by default", cls: 'label' });
        defaultInsertAsLinkContainer.createDiv({ cls: "spacer" })
        const defaultInsertAsLink = new ToggleComponent(defaultInsertAsLinkContainer);
        defaultInsertAsLink.setValue(AbstractDateBasedField.stringToBoolean(this.field.options.defaultInsertAsLink))
        defaultInsertAsLink.onChange((value: boolean) => {
            this.field.options.defaultInsertAsLink = value;
        });

        //folder path for link
        const dateLinkPathContainer = container.createDiv({ cls: "field-container" });
        dateLinkPathContainer.createEl("span", { text: "Link path (optional)", cls: 'label' })
        const dateLinkPathInput = new TextComponent(dateLinkPathContainer)
        dateLinkPathInput.inputEl.addClass("with-label")
        dateLinkPathInput.inputEl.addClass("full-width")
        dateLinkPathInput.setValue(this.field.options.linkPath)
        dateLinkPathInput.onChange((value: string) => {
            this.field.options.linkPath = value + ((!value.endsWith("/") && !!value.length) ? "/" : "");
        });

        // shift interval (should be a number or a luxon humanized duration (requires dataview) -> to include in validation)
        const dateShiftIntervalContainer = container.createDiv({ cls: "field-container" });
        dateShiftIntervalContainer.createEl("span", { text: "Define a shift interval", cls: 'label' });
        dateShiftIntervalContainer.createDiv({ cls: "spacer" })
        const dateShiftInterval = new TextComponent(dateShiftIntervalContainer);
        dateShiftInterval.setPlaceholder("ex: 1 month, 2 days")
        dateShiftInterval.setValue(this.field.options.dateShiftInterval)
        dateShiftInterval.onChange((value: string) => {
            if (!value) {
                delete this.field.options.dateShiftInterval;
            } else {
                this.field.options.dateShiftInterval = value.toString();
            }
        });

        // intervals cycle field name
        const nextShiftIntervalFieldContainer = container.createDiv({ cls: "field-container" });
        nextShiftIntervalFieldContainer.createEl("span", {
            text: "Field containing shift intervals",
            cls: 'label'
        });
        nextShiftIntervalFieldContainer.createDiv({ cls: "spacer" })
        const nextShiftIntervalField = new DropdownComponent(nextShiftIntervalFieldContainer);
        nextShiftIntervalField.addOption("none", "---None---")
        let rootFields: Field[] = []
        if (this.field.fileClassName) {
            rootFields = this.plugin.fieldIndex.fileClassesFields
                .get(this.field.fileClassName || "")?.filter(_f => _f.isRoot() && _f.name !== this.field.name && _f.type === FieldType.Cycle) || []

        } else {
            rootFields = this.plugin.presetFields.filter(_f => _f.name !== this.field.name && _f.type === FieldType.Cycle)
        }
        // limit choices to root fields
        rootFields.forEach(_f => nextShiftIntervalField.addOption(_f.id, _f.name))
        const currentField = rootFields.find(_f => _f.name === this.field.options.nextShiftIntervalField)?.id || "none"
        nextShiftIntervalField.setValue(currentField)
        nextShiftIntervalField.onChange(value => {
            if (value === "none") {
                delete this.field.options.nextShiftIntervalField;
            } else {
                this.field.options.nextShiftIntervalField = rootFields.find(_f => _f.id === value)?.name.toString();
            }
        })
    }

    public async getMomentDate(file: TFile, indexedPath?: string): Promise<moment.Moment> {
        const { dateFormat } = this.field.options
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        const _date = eF?.value
        const _dateLink = getLink(_date, file)
        const _dateText = _dateLink ? _dateLink.path.split("/").last()?.replace(/(.*).md/, "$1") : _date
        return moment(_dateText, dateFormat)
    }

    public async getNewDateValue(currentShift: string | undefined, file: TFile, indexedPath?: string) {
        const { dateFormat } = this.field.options
        const momentDate = await this.getMomentDate(file, indexedPath)
        const [_shiftNumber, shiftPeriod] = currentShift?.split(" ") || ["1", "days"]
        const shiftNumber = parseInt(_shiftNumber) || 1
        const _newDate = momentDate.isValid() ? momentDate.add(shiftNumber, shiftPeriod as moment.unitOfTime.DurationConstructor).format(dateFormat) : undefined
        return _newDate || moment().format(dateFormat)
    }

    public async shiftDate(file: TFile, indexedPath?: string): Promise<void> {
        if (!indexedPath) return
        const { dateFormat, defaultInsertAsLink, linkPath } = this.field.options
        const fieldManager: AbstractDateBasedField = new FM[this.field.type](this.plugin, this.field);
        const [currentShift, nextIntervalField, nextShift]: [string | undefined, Field | undefined, string | undefined] = await fieldManager.shiftDuration(file);
        const newValue = await this.getNewDateValue(currentShift, file, indexedPath)
        //Since nextIntervalField path are limited to root, we can pass the field id as an argument for post values
        if (nextIntervalField && nextShift) {
            await postValues(this.plugin, [{ indexedPath: nextIntervalField.id, payload: { value: nextShift } }], file.path)
        }
        const linkFile = this.plugin.app.metadataCache.getFirstLinkpathDest(linkPath || "" + newValue.format(dateFormat), file.path)
        const formattedValue = AbstractDateBasedField.stringToBoolean(defaultInsertAsLink) ?
            `[[${linkPath || ""}${newValue}${linkFile ? "|" + linkFile.basename : ""}]]` :
            newValue.format(dateFormat)
        await postValues(this.plugin, [{ indexedPath: indexedPath, payload: { value: formattedValue } }], file)
    }

    public async clearDate(file: TFile, indexedPath?: string): Promise<void> {
        if (!indexedPath) return
        await postValues(this.plugin, [{ indexedPath: indexedPath, payload: { value: "" } }], file)
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; } = {}
    ): void {
        attrs.cls = "value-container"
        const fieldValue = dv.el('span', p[this.field.name] || "", attrs);
        const dateBtn = fieldContainer.createEl("button")
        setIcon(dateBtn, FieldIcon[FieldType.Date])
        const spacer = fieldContainer.createDiv({ cls: "spacer-1" })

        this.shiftBtn = fieldContainer.createEl("button")
        setIcon(this.shiftBtn, "skip-forward")
        spacer.setAttr("class", "spacer-2")

        const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)

        if (file instanceof TFile && file.extension == "md") {
            dateBtn.onclick = async () => await this.buildAndOpenModal(file, this.field.id)
            this.shiftBtn.onclick = () => { if (file) this.shiftDate(file, this.field.id) }
        }

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

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked: () => {}): void {
        const dateFormat = this.field.options.dateFormat
        const dateLink = getLink(value, file)
        if (dateLink?.path) {
            const linkText = dateLink.path.split("/").last() || ""
            const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
            linkEl.onclick = () => {
                this.plugin.app.workspace.openLinkText(dateLink.path, file.path, true)
                onClicked();
            }
        } else {
            const date = moment(value, dateFormat)
            if (date.isValid()) {
                const dateText = date.format(this.field.options.dateFormat)
                if (this.field.options.defaultInsertAsLink) {
                    const rootFolder = this.field.options.linkPath
                    const linkEl = container.createEl('a', { text: dateText });
                    linkEl.onclick = () => {
                        this.plugin.app.workspace.openLinkText(`${rootFolder ? rootFolder + "/" : ""}${dateText}.md`, file.path, true)
                        onClicked();
                    }
                } else {
                    container.createDiv({ text: dateText });
                }
            } else {
                container.createDiv({ text: value });
            }
        }
        container.createDiv({});
    }

    public validateValue(value: string): boolean {
        if (!value) {
            return true
        } else {
            if (typeof (value) == 'string') {
                return moment(
                    value.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(),
                    this.field.options.dateFormat
                ).isValid()
            } else {
                return moment(
                    (value as { path: string })
                        .path.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(),
                    this.field.options.dateFormat
                ).isValid()
            }

        }
    }

    public async shiftDuration(file: TFile): Promise<[string | undefined, Field | undefined, string | undefined]> {

        const interval = this.field.options.dateShiftInterval
        const cycleIntervalField = this.field.options.nextShiftIntervalField
        const cycle = this.plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === cycleIntervalField)
        let currentValue: string | undefined
        let nextValue: string | undefined
        if (cycle) {
            //cycle field exists
            const cycleManager: CycleField = new FM[cycle.type](this.plugin, cycle)
            const options = cycleManager.getOptionsList();
            currentValue = (await Note.getExistingFieldForIndexedPath(this.plugin, file, cycle.id))?.value
            if (currentValue) {
                //current value has a match in cycle options
                nextValue = cycleManager.nextOption(currentValue)

            } else {
                currentValue = options[0]
                nextValue = options[1]
            }
            //current value is not found or : fall back on first value
        } else if (interval) {
            //no cycle field: fall back on interval if exists
            currentValue = interval
        }
        const [_nextShiftNumber, nextShiftPeriod] = currentValue?.split(" ") || ["1", "days"]
        const nextShiftNumber = parseInt(_nextShiftNumber) || 1
        if (moment.isDuration(moment.duration(nextShiftNumber, nextShiftPeriod as moment.unitOfTime.DurationConstructor))) {
            return [currentValue, cycle, nextValue]
        } else {
            return [currentValue, cycle, interval]
        }
    }
}

