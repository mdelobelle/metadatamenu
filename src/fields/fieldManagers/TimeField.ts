import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, moment, TFile, ToggleComponent, DropdownComponent } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import CycleField from "../fieldManagers/CycleField";
import { FieldManager as FM } from "src/types/fieldTypes";
import { FieldOptions } from "src/components/NoteFields";
import { postValues } from "src/commands/postValues";
import { getLink } from "src/utils/parser";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
import TimeModal from "src/modals/fields/TimeModal";
export default class TimeField extends FieldManager {

    public defaultTimeFormat: string = "HH:mm"
    private shiftBtn: HTMLButtonElement

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Time)
        this.showModalOption = false;
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        const modal = new TimeModal(this.plugin, file, this.field, eF, indexedPath);
        modal.titleEl.setText(`Change time for <${this.field.name}>`);
        modal.open()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const timeIconName = FieldIcon[this.field.type];
        const timeModalAction = async () => await this.buildAndOpenModal(file, indexedPath);
        const shiftTimeAction = async () => await this.shiftTime(file, indexedPath);
        const clearTimeAction = async () => await this.clearTime(file, indexedPath)
        if (TimeField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: timeModalAction,
                icon: timeIconName
            })
            if (this.field.options.timeShiftInterval || this.field.options.nextShiftIntervalField) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Shift <b>${name}</b> ahead</span>`,
                    action: shiftTimeAction,
                    icon: "skip-forward"
                })
            }
            location.options.push({
                id: `clear_${name}`,
                actionLabel: `<span>Clear <b>${name}</b></span>`,
                action: clearTimeAction,
                icon: "eraser"
            })
        } else if (TimeField.isFieldOptions(location)) {
            location.addOption("skip-forward", shiftTimeAction, `Shift ${name} ahead`);
            location.addOption(timeIconName, timeModalAction, `Set ${name}'s time`);
        };
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
        const fieldModal = new TimeModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        fieldModal.titleEl.setText(`Enter time for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        if (!this.field.options.timeFormat) this.field.options.timeFormat = this.defaultTimeFormat
        const timeFormatContainer = container.createDiv({ cls: "field-container" });
        timeFormatContainer.createEl("span", { text: "Time format", cls: 'label' })
        const timeExample = timeFormatContainer.createEl("span", { cls: 'more-info' })
        const timeFormatInput = new TextComponent(timeFormatContainer)
        timeFormatInput.inputEl.addClass("with-label")
        timeFormatInput.inputEl.addClass("full-width")
        timeFormatInput.setValue(this.field.options.timeFormat)
        timeExample.setText(`${moment().format(timeFormatInput.getValue())}`)
        timeFormatInput.onChange((value: string) => {
            this.field.options.timeFormat = value
            timeExample.setText(`${moment().format(value)}`);
        });

        // shift interval (should be a number or a luxon humanized duration (requires dataview) -> to include in validation)
        const timeShiftIntervalContainer = container.createDiv({ cls: "field-container" });
        timeShiftIntervalContainer.createEl("span", { text: "Define a shift interval", cls: 'label' });
        timeShiftIntervalContainer.createDiv({ cls: "spacer" })
        const timeShiftInterval = new TextComponent(timeShiftIntervalContainer);
        timeShiftInterval.setPlaceholder("ex: 1 hour, 32 minutes")
        timeShiftInterval.setValue(this.field.options.timeShiftInterval)
        timeShiftInterval.onChange((value: string) => {
            if (!value) {
                delete this.field.options.timeShiftInterval;
            } else {
                this.field.options.timeShiftInterval = value.toString();
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

    public async getMomentTime(file: TFile, indexedPath?: string): Promise<moment.Moment> {
        const { timeFormat } = this.field.options
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        const _time = eF?.value
        return moment(_time, timeFormat)
    }

    public async getNewTimeValue(currentShift: string | undefined, file: TFile, indexedPath?: string) {
        const { timeFormat } = this.field.options
        const momentTime = await this.getMomentTime(file, indexedPath)
        const [_shiftNumber, shiftPeriod] = currentShift?.split(" ") || ["1", "days"]
        const shiftNumber = parseInt(_shiftNumber) || 1
        const _newTime = momentTime.isValid() ? momentTime.add(shiftNumber, shiftPeriod as moment.unitOfTime.DurationConstructor).format(timeFormat) : undefined
        return _newTime || moment().format(timeFormat)
    }

    public async shiftTime(file: TFile, indexedPath?: string): Promise<void> {
        if (!indexedPath) return
        const { timeFormat } = this.field.options
        const fieldManager: TimeField = new FM[this.field.type](this.plugin, this.field);
        const [currentShift, nextIntervalField, nextShift]: [string | undefined, Field | undefined, string | undefined] = await fieldManager.shiftDuration(file);
        const newValue = await this.getNewTimeValue(currentShift, file, indexedPath)
        //Since nextIntervalField path are limited to root, we can pass the field id as an argument for post values
        if (nextIntervalField && nextShift) {
            await postValues(this.plugin, [{ indexedPath: nextIntervalField.id, payload: { value: nextShift } }], file.path)
        }
        const formattedValue = newValue.format(timeFormat)
        await postValues(this.plugin, [{ indexedPath: indexedPath, payload: { value: formattedValue } }], file)

    }

    public async clearTime(file: TFile, indexedPath?: string): Promise<void> {
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
        const timeBtn = fieldContainer.createEl("button")
        setIcon(timeBtn, FieldIcon[FieldType.Time])
        const spacer = fieldContainer.createDiv({ cls: "spacer-1" })

        this.shiftBtn = fieldContainer.createEl("button")
        setIcon(this.shiftBtn, "skip-forward")
        spacer.setAttr("class", "spacer-2")

        const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)

        if (file instanceof TFile && file.extension == "md") {
            timeBtn.onclick = async () => await this.buildAndOpenModal(file, this.field.id)
            this.shiftBtn.onclick = () => { if (file) this.shiftTime(file, this.field.id) }
        }

        if (!attrs?.options?.alwaysOn) {
            timeBtn.hide()
            if (this.shiftBtn) this.shiftBtn.hide()
            spacer.show()
            fieldContainer.onmouseover = () => {
                timeBtn.show()
                if (this.shiftBtn) this.shiftBtn.show()
                spacer.hide()
            }
            fieldContainer.onmouseout = () => {
                timeBtn.hide()
                if (this.shiftBtn) this.shiftBtn.hide()
                spacer.show()
            }
        }

        /* initial state */
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(timeBtn);
        if (this.shiftBtn) fieldContainer.appendChild(this.shiftBtn);
        fieldContainer.appendChild(spacer);
    }

    public getOptionsStr(): string {
        return this.field.options.timeFormat;
    }

    public validateOptions(): boolean {
        return true;
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked: () => {}): void {
        const timeFormat = this.field.options.timeFormat
        const time = moment(value, timeFormat)
        if (time.isValid()) {
            const timeText = time.format(this.field.options.timeFormat)
            container.createDiv({ text: timeText });

        } else {
            container.createDiv({ text: value });
        }
        container.createDiv({});
    }

    public validateValue(value: string): boolean {
        if (!value) {
            return true
        } else {
            return moment(
                value,
                this.field.options.timeFormat
            ).isValid()
        }
    }

    public async shiftDuration(file: TFile): Promise<[string | undefined, Field | undefined, string | undefined]> {

        const interval = this.field.options.timeShiftInterval
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
        const [_nextShiftNumber, nextShiftPeriod] = currentValue?.split(" ") || ["1", "minutes"]
        const nextShiftNumber = parseInt(_nextShiftNumber) || 1
        if (moment.isDuration(moment.duration(nextShiftNumber, nextShiftPeriod as moment.unitOfTime.DurationConstructor))) {
            return [currentValue, cycle, nextValue]
        } else {
            return [currentValue, cycle, interval]
        }
    }

}