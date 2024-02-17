import MetadataMenu from "main"
import { ButtonComponent, TFile, TextAreaComponent, setIcon } from "obsidian"
import { ExistingField } from "src/fields/ExistingField"
import { getIcon, valueString } from "src/fields/Fields"
import { Note } from "src/note/note"
import { Constructor } from "src/typings/types"
import { Field, IField, IFieldManager, Target, getIdAndIndex, isSingleTargeted, removeValidationError, upperIndexedPathObjectPath, upperPath } from "../../Field"
import { BaseOptions } from "../../base/BaseField"
import { BaseValueModal, IBaseValueModal, basicSuggestModal } from "../../base/BaseModal"
import { ISettingsModal } from "../../base/BaseSetting"

export interface Options extends BaseOptions {
    displayTemplate?: string
}
export interface DefaultedOptions extends Options {
    displayTemplate: string
}
export const DefaultOptions: DefaultedOptions = {
    displayTemplate: ""
}

export interface IObjectBaseSettingModal extends ISettingsModal<Options> {
    createSettingContainer(): void
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<IObjectBaseSettingModal> {
    return class SettingsModal extends Base {

        createSettingContainer() {
            const container = this.optionsContainer
            const objectDisplayTemplateTopContainer = container.createDiv({ cls: "vstacked" });
            objectDisplayTemplateTopContainer.createEl("span", { text: "Object display template", cls: 'label' });
            objectDisplayTemplateTopContainer.createEl("span", { text: "The number of items is referenced by the keyword 'itemsCount'", cls: 'sub-text' });
            const objectDisplayTemplateContainer = objectDisplayTemplateTopContainer.createDiv({ cls: "field-container" });
            const objectTemplate = new TextAreaComponent(objectDisplayTemplateContainer);
            objectTemplate.inputEl.addClass("full-width");
            objectTemplate.inputEl.cols = 50;
            objectTemplate.inputEl.rows = 4;
            objectTemplate.setValue(this.field.options.displayTemplate || "");
            objectTemplate.setPlaceholder("example: {{itemsCount}} items");

            objectTemplate.onChange(value => {
                this.field.options.displayTemplate = value;
                removeValidationError(objectTemplate);
            })
        }

        validateOptions(): boolean {
            return true
        }
    }
}

export interface Modal<Target> extends IBaseValueModal<Target> { }

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = basicSuggestModal<string, Options>(managedField, plugin)
    return class ValueModal extends base {
        getSuggestions(query: string): string[] | Promise<string[]> {
            throw new Error("Method not implemented.")
        }
        renderSuggestion(value: string, el: HTMLElement) {
            throw new Error("Method not implemented.")
        }
        onChooseSuggestion(item: string, evt: KeyboardEvent | MouseEvent) {
            throw new Error("Method not implemented.")
        }
        public managedField: IFieldManager<Target, Options>
        public addButton: ButtonComponent;
        public previousModal?: BaseValueModal<Target, BaseOptions>
        public saved: boolean
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.containerEl.addClass("metadata-menu")
            this.containerEl.addClass("narrow")
            const headerContainer = this.containerEl.createDiv({ cls: "suggester-input" })
            const { id, index } = getIdAndIndex(managedField.indexedPath)
            if (id?.includes("____") || index !== undefined) this.buildBackButton(headerContainer)
            this.buildTitle(headerContainer)
            this.inputEl.disabled = true
            this.inputEl.addClass("input-as-title")
            this.containerEl.find(".prompt").prepend(headerContainer)
            headerContainer.appendChild(this.inputEl)
            this.buildAddButton(headerContainer)
            this.containerEl.onkeydown = async (e) => {
                if (e.key == "Enter" && e.altKey) {
                    e.preventDefault()
                    await this.onAdd()
                }
                if (e.key == "Escape" && e.altKey) {
                    e.preventDefault()
                    this.onEscape()
                }
            }
        }

        buildTitle(container: HTMLDivElement) {
            const titleContainer = container.createDiv({ cls: "suggester-title" })
            const indexedPath = this.managedField.indexedPath || ""
            const { id, index } = getIdAndIndex(indexedPath?.split("____").last())
            if (!isSingleTargeted(this.managedField)) return
            if (!this.managedField.eF) {
                const upperPath = upperIndexedPathObjectPath(this.managedField.indexedPath || "")
                const { id: upperId, index: upperIndex } = getIdAndIndex(upperPath.split("____").last())
                const field = this.managedField.plugin.fieldIndex.filesFields.get(this.managedField.target.path)?.find(f => f.id === upperId)
                titleContainer.setText(`${field?.name || "unknown"}${index ? " [" + index + "]" : ""}`)
            } else {
                if (index) {
                    titleContainer.setText(`${this.managedField.eF.name}[${index}]`)
                } else {
                    titleContainer.setText(`${this.managedField.eF?.name}`)
                }
            }
        }
        public buildAddButton(container: HTMLDivElement) { }

        public async onAdd() { }

        public onEscape() {
            this.managedField.previousModal?.open()
            this.close()
        }

        private buildBackButton(container: HTMLDivElement) {
            const backButton = new ButtonComponent(container)
            backButton.setIcon("left-arrow")
            backButton.onClick(async () => { this.onEscape() })
            backButton.setCta();
            backButton.setTooltip("Go to parent field")
            const infoContainer = container.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Esc to go back")
        }
    }
}


export function getOptionsStr(field: IField<Options>): string {
    return field.options.displayTemplate || ""
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    console.error("Not implemented")
    return false
}

export async function getExistingAndMissingFields(plugin: MetadataMenu, file: TFile, indexedPath?: string): Promise<{
    existingFields: ExistingField[],
    missingFields: Field[]
}> {
    const existingFields = (await Note.getExistingFields(plugin, file)).filter(eF => eF.indexedPath &&
        upperPath(eF.indexedPath) === indexedPath)
    const { id, index } = getIdAndIndex(indexedPath?.split("____").last())
    const missingFields = plugin.fieldIndex.filesFields.get(file.path)?.filter(_f =>
        _f.getFirstAncestor()?.id === id).filter(_f => !existingFields.map(eF => eF.field.id).includes(_f.id)) || []
    return { existingFields, missingFields }
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    /* button to display input */
    const editBtn = fieldContainer.createEl("button");
    managedField.value = p[managedField.name] || {}
    const value = valueString(managedField.type)(managedField)
    const fieldValue = (dv.el('span', value || "", attrs) as HTMLDivElement);
    fieldContainer.appendChild(fieldValue);
    setIcon(editBtn, getIcon(managedField.type))
    editBtn.onclick = async () => {
        const file = managedField.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        const _eF = file instanceof TFile && await Note.getExistingFieldForIndexedPath(managedField.plugin, file, managedField.id)
        if (!_eF) return
        managedField.eF = _eF
        managedField.value = _eF.value
        managedField.indexedPath = _eF.indexedPath
        managedField.openModal()
    }

}


//#region utils

//#endregion