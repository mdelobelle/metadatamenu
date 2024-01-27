import MetadataMenu from "main"
import { ButtonComponent, DropdownComponent, TFile, TextComponent, ToggleComponent, moment, setIcon } from "obsidian"
import { getExistingFieldForIndexedPath } from "src/fields/ExistingField"
import { FieldType, getIcon, mapFieldType } from "src/fields/Fields"
import GField from "src/fields/_Field"
import { Note } from "src/note/note"
import { Constructor } from "src/typings/types"
import { cleanActions } from "src/utils/modals"
import { getLink } from "src/utils/parser"
import { ActionLocation, IField, IFieldManager, LegacyField, Target, fieldValueManager, isFieldActions, isSingleTargeted, isSuggest } from "../../Field"
import { BaseOptions } from "../../base/BaseField"
import { IBaseValueModal, IBasicModal, basicModal } from "../../base/BaseModal"
import { ISettingsModal } from "../../base/BaseSetting"
import { Options as CycleOptions, getOptionsList as getCycleOptionsList, getNextOption } from "../Cycle"
import { postValues } from "src/commands/postValues"


//#endregion

export interface Options extends BaseOptions {
    dateShiftInterval: string,
    nextShiftIntervalField?: string,
    dateFormat: string,
    defaultInsertAsLink: boolean,
    linkPath: string,
}

export interface DefaultedOptions extends Options {
    dateShiftInterval: string,
}

export const DefaultOptions: DefaultedOptions = {
    dateShiftInterval: "1 day",
    dateFormat: "YYYY-MM-DD",
    defaultInsertAsLink: false,
    linkPath: ""
}

export interface IDateBaseSettingModal extends ISettingsModal<Options> {
    createSettingContainer(): void
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<IDateBaseSettingModal> {
    return class SettingsModal extends Base {
        createSettingContainer() {
            const container = this.optionsContainer
            if (!this.field.options.dateFormat) this.field.options.dateFormat = DefaultOptions.dateFormat
            if (!this.field.options.defaultInsertAsLink) this.field.options.defaultInsertAsLink = DefaultOptions.defaultInsertAsLink
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

            if (this.field.type !== "Time") {
                // insert as link toggler
                const defaultInsertAsLinkContainer = container.createDiv({ cls: "field-container" });
                defaultInsertAsLinkContainer.createEl("span", { text: "Insert as link by default", cls: 'label' });
                defaultInsertAsLinkContainer.createDiv({ cls: "spacer" })
                const defaultInsertAsLink = new ToggleComponent(defaultInsertAsLinkContainer);
                defaultInsertAsLink.setValue(this.field.options.defaultInsertAsLink)
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

            }

            // shift interval (should be a number or a luxon humanized duration (requires dataview) -> to include in validation)
            const dateShiftIntervalContainer = container.createDiv({ cls: "field-container" });
            dateShiftIntervalContainer.createEl("span", { text: "Define a shift interval", cls: 'label' });
            dateShiftIntervalContainer.createDiv({ cls: "spacer" })
            const dateShiftInterval = new TextComponent(dateShiftIntervalContainer);
            dateShiftInterval.setPlaceholder("ex: 1 month, 2 days")
            dateShiftInterval.setValue(this.field.options.dateShiftInterval || DefaultOptions.dateShiftInterval)
            dateShiftInterval.onChange((value: string) => {
                if (!value) {
                    this.field.options.dateShiftInterval = DefaultOptions.dateShiftInterval;
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
            let rootFields: GField[] = []
            if (this.field.fileClassName) {
                rootFields = this.plugin.fieldIndex.fileClassesFields
                    .get(this.field.fileClassName || "")?.filter(_f => _f.isRoot() && _f.name !== this.field.name && _f.type === "Cycle") || []

            } else {
                rootFields = this.plugin.presetFields.filter(_f => _f.name !== this.field.name && _f.type === this.field.type)
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
        validateOptions(): boolean {
            return true;
        }
    }
}

export interface Modal<T extends Target> extends IBaseValueModal<T> { }


function getInputType(type: FieldType): string {
    switch (type) {
        case "Date": return "date"
        case "DateTime": return "datetime-local"
        case "Time": return "time"
        default: throw Error("Not implemented")
    }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    //TODO inserer le multi target change
    const base = basicModal(managedField, plugin)
    return class ValueModal extends base {
        public managedField: IFieldManager<Target, Options>
        private shiftFromTodayBtn: ButtonComponent
        private pathTemplateItems: Record<string, string> = {}
        private value: string;
        private insertAsLink: boolean;
        private inputEl: TextComponent;
        private errorField: HTMLDivElement;
        private format: string;
        private nextIntervalField?: GField;
        private pushNextInterval: boolean = false;
        private currentShift?: string
        private nextShift?: string
        private initialValue: string


        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            const initialValue = this.managedField.value || ""
            this.initialValue = initialValue ? initialValue.toString().replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last() || "" : "";
            this.insertAsLink = this.managedField.options.defaultInsertAsLink;
            this.format = this.managedField.options.dateFormat || this.managedField.options.defaultDateFormat;
            this.value = this.initialValue;
        }

        async onOpen() {
            super.onOpen()
            await this.build()
        }

        async build() {
            this.containerEl.addClass("metadata-menu")
            cleanActions(this.contentEl, ".field-container");
            cleanActions(this.contentEl, ".field-error");
            const fieldContainer = this.contentEl.createDiv({ cls: "field-container" });
            await this.buildFields(fieldContainer);
            this.errorField = this.contentEl.createEl("div", { cls: "field-error" });
            this.errorField.hide();
        }

        private async buildFields(dateFieldsContainer: HTMLDivElement): Promise<void> {
            await this.buildInputEl(dateFieldsContainer);
            this.buildInsertAsLinkButton(dateFieldsContainer);
            this.buildClearBtn(dateFieldsContainer);
            this.buildSaveBtn(dateFieldsContainer);
        }

        private async buildInputEl(container: HTMLDivElement): Promise<void> {
            [this.currentShift, this.nextIntervalField, this.nextShift] = await shiftDuration(this.managedField);
            const wrapper = container.createDiv({ cls: "date-input-wrapper" })
            this.inputEl = new TextComponent(wrapper);
            this.inputEl.inputEl.addClass("master-input")
            this.inputEl.inputEl.addClass(this.managedField.type.toLowerCase())
            this.inputEl.inputEl.focus();

            this.inputEl.setPlaceholder(
                this.initialValue
                    ? moment(this.initialValue, this.managedField.options.dateFormat).format(this.managedField.options.dateFormat)
                    : "");
            this.inputEl.onChange(value => {
                this.inputEl.inputEl.removeClass("is-invalid")
                this.errorField.hide();
                this.errorField.setText("");
                this.value = value
                if (isSingleTargeted(this.managedField)) this.toggleButton(this.shiftFromTodayBtn, value)
            });

            const calendarInput = wrapper.createEl(
                "input",
                {
                    type: getInputType(this.managedField.type),
                    cls: this.managedField.type === "Time"
                        ? "time-picker"
                        : "date-picker"
                }
            )
            calendarInput.value = !this.initialValue
                ? ""
                : this.managedField.type === "Time"
                    ? moment(this.initialValue, this.managedField.options.dateFormat).format(this.managedField.options.dateFormat)
                    : moment(this.initialValue, this.managedField.options.dateFormat).format("yyyy-MM-DDTHH:mm")
            calendarInput.oninput = (e) => {
                const newValue = this.managedField.type === "Time"
                    ? moment((e.target as HTMLInputElement)?.value, "HH:mm").format(this.format)
                    : moment((e.target as HTMLInputElement)?.value, "YYYY-MM-DDTHH:mm").format(this.format)
                this.inputEl.setValue(newValue)
                this.value = newValue
            }
            if (isSingleTargeted(this.managedField)) this.buildShiftBtn(container)
        };

        private buildShiftBtn(container: HTMLDivElement) {
            this.shiftFromTodayBtn = new ButtonComponent(container)
                .setIcon("skip-forward")
                .setTooltip(`Shift ${this.managedField.name} ${this.currentShift || "1 day"} ahead`)
                .onClick((e: MouseEvent) => {
                    const newValue = getNewDateValue(this.managedField, this.currentShift)
                    if (!newValue) return
                    this.inputEl.setValue(newValue);
                    this.value = newValue;
                    this.pushNextInterval = true;
                    this.toggleButton(this.shiftFromTodayBtn, this.inputEl.getValue())
                })
        }

        private buildPath(value: moment.Moment): string {
            let renderedPath = this.managedField.options.linkPath || ""
            const templatePathRegex = new RegExp(`\\{\\{(?<pattern>[^\\}]+?)\\}\\}`, "gu");
            const tP = renderedPath.matchAll(templatePathRegex)
            let next = tP.next();
            while (!next.done) {
                if (next.value.groups) {
                    const pattern = next.value.groups.pattern
                    this.pathTemplateItems[pattern] = moment(value).format(pattern)
                }
                next = tP.next()
            }
            Object.keys(this.pathTemplateItems).forEach(k => {
                const fieldRegex = new RegExp(`\\{\\{${k}(:[^\\}]*)?\\}\\}`, "u")
                renderedPath = renderedPath.replace(fieldRegex, this.pathTemplateItems[k])
            })
            return renderedPath
        }

        public buildSaveBtn(fieldContainer: HTMLDivElement) {
            fieldContainer.createDiv({ cls: "spacer" })
            const infoContainer = fieldContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            const saveBtn = new ButtonComponent(fieldContainer);
            saveBtn.setIcon("checkmark");
            saveBtn.onClick(() => { this.save(); })
        }

        public async save(): Promise<void> {
            let newValue: moment.Moment;
            //try natural language date
            if (this.managedField.plugin.app.plugins.enabledPlugins.has('nldates-obsidian') && this.managedField.type === "Date") {
                try {
                    const nldates = this.managedField.plugin.app.plugins.plugins['nldates-obsidian'];
                    const parsedDate = nldates.parseDate(`${this.value}`)
                    newValue = parsedDate.date ? parsedDate.moment : moment(`${this.value}`, this.format);
                } catch (error) {
                    newValue = moment(`${this.value}`, this.format);
                }
            } else {
                newValue = moment(`${this.value}`, this.format);
            }
            if (newValue.isValid()) {
                const renderedPath = this.buildPath(newValue)
                const destPath = renderedPath || "" + newValue.format(this.format)
                const sourcePath = isSingleTargeted(this.managedField)
                    ? this.managedField.target.path
                    : destPath
                const linkPath = this.managedField.plugin.app.metadataCache.getFirstLinkpathDest(destPath, sourcePath)
                const formattedValue = this.insertAsLink
                    ? `[[${renderedPath || ""}${newValue.format(this.format)}${linkPath ? "|" + linkPath.basename : ""}]]`
                    : newValue.format(this.format)
                this.managedField.save(formattedValue)
                this.saved = true
                if (this.managedField.previousModal) await this.goToPreviousModal()
                if (this.nextIntervalField
                    && this.pushNextInterval
                    && this.nextShift
                    && isSingleTargeted(this.managedField))
                    updateIntervalField(this.managedField, this.nextIntervalField, this.nextShift)
                this.close();
            } else if (!this.value) {
                this.managedField.save("")
                this.saved = true
                if (this.managedField.previousModal) await this.goToPreviousModal()
                this.close()
            } else {
                this.errorField.show();
                this.errorField.setText(`value must be a valid date`)
                this.inputEl.inputEl.addClass("is-invalid")
                return
            }
        }

        private buildInsertAsLinkButton(container: HTMLDivElement) {
            const insertAsLinkBtn = new ButtonComponent(container);
            const setLinkBtnIcon = () => {
                insertAsLinkBtn.setIcon(this.insertAsLink ? "link" : "unlink");
                insertAsLinkBtn.setTooltip(this.insertAsLink ?
                    "Click to insert date as text" :
                    "Click to insert date as link"
                )
            }
            setLinkBtnIcon();
            insertAsLinkBtn.onClick(() => {
                this.insertAsLink = !this.insertAsLink;
                setLinkBtnIcon();
            })

        }

        private buildClearBtn(container: HTMLDivElement) {
            const clearBtn = new ButtonComponent(container);
            clearBtn.setIcon("eraser");
            clearBtn.setTooltip(`Clear ${this.managedField.name}'s date`)
            clearBtn.onClick(() => {
                this.value = "";
                this.inputEl.setValue("")
                this.inputEl.setPlaceholder("Empty")
            })
        }

        private toggleButton(button: ButtonComponent, value: string): void {
            button.setDisabled(!!value)
            if (value) {
                button.buttonEl.addClass("disabled")
            } else {
                button.buttonEl.removeClass("disabled")
            }
        }
    }
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    const dateFormat = managedField.options.dateFormat
    const source = isSingleTargeted(managedField) ? managedField.target : undefined
    const dateLink = getLink(managedField.value, source)
    if (dateLink?.path) {
        const linkText = dateLink.path.split("/").last() || ""
        const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
        linkEl.onclick = () => {
            managedField.plugin.app.workspace.openLinkText(dateLink.path, (source || dateLink).path, true)
            onClicked();
        }
    } else {
        const date = moment(managedField.value, dateFormat)
        if (date.isValid()) {
            const dateText = date.format(managedField.options.dateFormat)
            if (managedField.options.defaultInsertAsLink) {
                const rootFolder = managedField.options.linkPath
                const linkEl = container.createEl('a', { text: dateText });
                linkEl.onclick = () => {
                    const linkPath = `${rootFolder ? rootFolder + "/" : ""}${dateText}.md`
                    managedField.plugin.app.workspace.openLinkText(linkPath, source ? source.path : linkPath, true)
                    onClicked();
                }
            } else {
                container.createDiv({ text: dateText });
            }
        } else {
            container.createDiv({ text: managedField.value });
        }
    }
    container.createDiv({});
}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    const dateIconName = getIcon(mapFieldType(field.type));
    const name = field.name
    const fieldVM = fieldValueManager<Options>(plugin, field.id, field.fileClassName, file, undefined, indexedPath)
    if (!fieldVM) return
    const getManagedFieldValue = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldVM.eF = eF
        fieldVM.value = eF?.value
    }
    const dateModalAction = async () => {
        await getManagedFieldValue()
        fieldVM.openModal()
    }
    const shiftDateAction = async () => {
        await getManagedFieldValue()
        await shiftDate(fieldVM);
    }
    const clearDateAction = async () => {
        await getManagedFieldValue()
        fieldVM.save("")
    }
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${name}`,
            actionLabel: `<span>Update <b>${name}</b></span>`,
            action: dateModalAction,
            icon: dateIconName
        })
        if (fieldVM.options.dateShiftInterval || fieldVM.options.nextShiftIntervalField) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Shift <b>${name}</b> ahead</span>`,
                action: shiftDateAction,
                icon: "skip-forward"
            })
        }
        location.options.push({
            id: `clear_${name}`,
            actionLabel: `<span>Clear <b>${name}</b></span>`,
            action: clearDateAction,
            icon: "eraser"
        })
    } else if (isFieldActions(location)) {
        location.addOption("skip-forward", shiftDateAction, `Shift ${name} ahead`);
        location.addOption(dateIconName, dateModalAction, `Set ${name}'s date`);
    };
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    managedField.value = p[managedField.name]
    const fieldValue = dv.el('span', p[managedField.name] || "", attrs);
    const dateBtn = fieldContainer.createEl("button")
    setIcon(dateBtn, getIcon(managedField.type))
    const spacer = fieldContainer.createDiv({ cls: "spacer-1" })

    const shiftBtn = fieldContainer.createEl("button")
    setIcon(shiftBtn, "skip-forward")
    spacer.setAttr("class", "spacer-2")

    const file = managedField.plugin.app.vault.getAbstractFileByPath(p.file.path)

    if (file instanceof TFile && file.extension == "md") {
        dateBtn.onclick = () => {
            managedField.openModal()
        }
        shiftBtn.onclick = () => { if (file) shiftDate(managedField) }
    }

    if (!attrs?.options?.alwaysOn) {
        dateBtn.hide()
        if (shiftBtn) shiftBtn.hide()
        spacer.show()
        fieldContainer.onmouseover = () => {
            dateBtn.show()
            if (shiftBtn) shiftBtn.show()
            spacer.hide()
        }
        fieldContainer.onmouseout = () => {
            dateBtn.hide()
            if (shiftBtn) shiftBtn.hide()
            spacer.show()
        }
    }

    /* initial state */
    fieldContainer.appendChild(fieldValue);
    fieldContainer.appendChild(dateBtn);
    if (shiftBtn) fieldContainer.appendChild(shiftBtn);
    fieldContainer.appendChild(spacer);
}

export function getOptionsStr(field: IField<Options>): string {
    return field.options.dateFormat;
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    const value = managedField.value
    if (!value) {
        return true
    } else {
        if (typeof (value) == 'string') {
            return moment(
                value.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(),
                managedField.options.dateFormat
            ).isValid()
        } else {
            return moment(
                (value as { path: string })
                    .path.replace(/^\[\[/g, "").replace(/\]\]$/g, "").split("|").first()?.split("/").last(),
                managedField.options.dateFormat
            ).isValid()
        }
    }
}

//#region utils

async function shiftDuration(managedField: IFieldManager<Target, Options>): Promise<[string | undefined, GField | undefined, string | undefined]> {
    if (!isSingleTargeted(managedField)) return [undefined, undefined, undefined]
    const interval = managedField.options.dateShiftInterval || DefaultOptions.dateShiftInterval
    const cycleIntervalField = managedField.options.nextShiftIntervalField
    const cycleField = managedField.plugin.fieldIndex.filesFields.get(managedField.target.path)?.find(field => field.name === cycleIntervalField)
    let nextValue: string | undefined
    let currentValue: string
    if (cycleField) {
        //cycle field exists
        const eF = (await Note.getExistingFieldForIndexedPath(managedField.plugin, managedField.target, cycleField.id))
        currentValue = eF?.value
        const cycleManager: IFieldManager<Target, CycleOptions> | undefined = fieldValueManager(managedField.plugin, cycleField.id, managedField.fileClassName, managedField.target, eF, cycleField.id)
        if (cycleManager) {
            const options = getCycleOptionsList(cycleManager);
            if (currentValue) {
                //current value has a match in cycle options
                nextValue = getNextOption(cycleManager)

            } else {
                currentValue = options[0]
                nextValue = options[1]
            }
        }
        //current value is not found or : fall back on first value
    } else {
        //no cycle field: fall back on interval if exists
        currentValue = interval
    }
    const [_nextShiftNumber, nextShiftPeriod] = currentValue.split(" ")
    const nextShiftNumber = parseInt(_nextShiftNumber) || 1
    if (moment.isDuration(moment.duration(nextShiftNumber, nextShiftPeriod as moment.unitOfTime.DurationConstructor))) {
        return [currentValue, cycleField, nextValue]
    } else {
        return [currentValue, cycleField, interval]
    }
}

function getNewDateValue(managedField: IFieldManager<Target, Options>, currentShift: string | undefined) {
    if (!isSingleTargeted(managedField)) return
    const { dateFormat } = managedField.options
    const momentDate = getMomentDate(managedField)
    if (!momentDate) return
    const [_shiftNumber, shiftPeriod] = currentShift?.split(" ") || DefaultOptions.dateShiftInterval
    const shiftNumber = parseInt(_shiftNumber) || 1
    const _newDate = momentDate.isValid() ? momentDate.add(shiftNumber, shiftPeriod as moment.unitOfTime.DurationConstructor).format(dateFormat) : undefined
    return _newDate || moment().format(dateFormat)
}

function getMomentDate(managedField: IFieldManager<Target, Options>): moment.Moment | undefined {
    if (!isSingleTargeted(managedField)) return
    const { dateFormat } = managedField.options
    const _date = managedField.value
    const _dateLink = getLink(_date, managedField.target)
    const _dateText = _dateLink ? _dateLink.path.split("/").last()?.replace(/(.*).md/, "$1") : _date
    return moment(_dateText, dateFormat)
}

async function updateIntervalField(managedField: IFieldManager<TFile, Options>, nextIntervalField: GField, nextShift: string): Promise<void> {
    postValues(managedField.plugin,
        [
            {
                indexedPath: managedField.indexedPath || managedField.id,
                payload: {
                    value: managedField.value
                },

            }, {
                indexedPath: nextIntervalField.id,
                payload: {
                    value: nextShift
                }
            }
        ],
        managedField.target, managedField.lineNumber, managedField.asList, managedField.asBlockquote
    )
}

async function shiftDate(managedField: IFieldManager<Target, Options>): Promise<void> {
    if (!isSingleTargeted(managedField)) return
    const { dateFormat, defaultInsertAsLink, linkPath } = managedField.options
    const [currentShift, nextIntervalField, nextShift] = await shiftDuration(managedField);
    const newValue = getNewDateValue(managedField, currentShift)
    //Since nextIntervalField path are limited to root, we can pass the field id as an argument for post values
    if (!newValue) return
    const linkFile = managedField.plugin.app.metadataCache.getFirstLinkpathDest(linkPath || "" + newValue.format(dateFormat), managedField.target.path)
    const formattedValue = defaultInsertAsLink ?
        `[[${linkPath || ""}${newValue}${linkFile ? "|" + linkFile.basename : ""}]]` :
        newValue.format(dateFormat)
    managedField.value = formattedValue
    if (nextIntervalField && nextShift) updateIntervalField(managedField, nextIntervalField, nextShift)
    else managedField.save()
}

//#endregion
