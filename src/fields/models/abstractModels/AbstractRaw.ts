import { Constructor } from "src/typings/types"
import { BaseOptions } from "../../base/BaseField"
import { ISettingsModal } from "../../base/BaseSetting"
import { LanguageSupport } from "@codemirror/language"
import { Extension } from "@codemirror/state"
import { StateField, EditorState } from "@codemirror/state"
import { IBaseValueModal, IBasicModal, basicModal } from "src/fields/base/BaseModal"
import { ActionLocation, IField, IFieldManager, Target, fieldValueManager, isFieldActions, isSuggest } from "src/fields/Field"
import MetadataMenu from "main"
import { EditorView, basicSetup } from "codemirror"
import { cleanActions } from "src/utils/modals"
import { ButtonComponent, TFile } from "obsidian"
import { lintGutter } from "@codemirror/lint"
import { getIcon } from "src/fields/Fields"
import { getExistingFieldForIndexedPath } from "src/fields/ExistingField"

export interface Options extends BaseOptions { }
export interface DefaultedOptions extends Options { }
export const DefaultOptions: DefaultedOptions = {}

export interface IRawBaseSettingModal extends ISettingsModal<Options> { }

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<IRawBaseSettingModal> {
    return class SettingsModal extends Base {

        createSettingContainer() { }
        validateOptions(): boolean {
            return true
        }
    }
}

export interface Modal<T extends Target> extends IBaseValueModal<T> {
    dumpValue(value: any): string;
    getExtraExtensions(): Array<LanguageSupport | Extension>
    loadValue(value: any): any;
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    //TODO inserer le multi target change
    const base = basicModal(managedField, plugin)
    return class ValueModal extends base {
        private editor: EditorView;
        private positionContainer: HTMLDivElement;
        public dumpValue(value: any): string { return "" }
        public getExtraExtensions(): Array<LanguageSupport | Extension> { return [] }
        public loadValue(value: any): any { }
        constructor(...rest: any[]) {
            super()
            this.buildPositionContainer();
            this.buildInputEl(this.contentEl.createDiv({ cls: "field-container" }));
            cleanActions(this.contentEl, ".footer-actions")
            //this.buildSaveBtn(this.contentEl.createDiv({ cls: "footer-actions" }));
            this.buildFooterBtn()
            this.containerEl.addClass("metadata-menu")
        }

        private buildPositionContainer() {
            this.positionContainer = this.contentEl.createDiv({ cls: "field-container" })
            this.positionContainer.textContent = "Position: "
        }

        private buildInputEl(container: HTMLDivElement): void {
            const getPosition = (state: EditorState) => {
                const range = state.selection.ranges.filter(range => range.empty).first()
                const position = range?.from || 0
                const line = state.doc.lineAt(range?.head || 0)
                const col = (range?.head || 0) - line.from
                this.positionContainer.textContent = `Line: ${line.number} | Col: ${col} | Position: ${position}`
            }

            const positionChange = StateField.define<void>({
                create: (state: EditorState) => getPosition(state),
                update(value, tr) { getPosition(tr.state) }
            })

            const gutter = lintGutter()
            this.editor = new EditorView({
                doc: this.dumpValue(this.loadValue(this.managedField.value)),
                extensions: [
                    basicSetup,
                    gutter,
                    positionChange,
                    this.getExtraExtensions()
                ],
                parent: container,
            });
        };

        private buildFooterBtn() {
            const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
            buttonContainer.createDiv({ cls: "spacer" })
            const infoContainer = buttonContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            //confirm button
            const confirmButton = new ButtonComponent(buttonContainer)
            confirmButton.setIcon("checkmark")
            confirmButton.onClick(async () => {
                this.save();
                this.close()
            })
            //cancel button
            const cancelButton = new ButtonComponent(buttonContainer)
            cancelButton.setIcon("cross")
            cancelButton.onClick(() => { this.close(); })
            this.modalEl.appendChild(buttonContainer)
        }

        public async save(): Promise<void> {
            const newContent = this.editor.state.doc.toString().trim()
            this.managedField.save(newContent)
            this.saved = true
            if (this.managedField.previousModal) await this.goToPreviousModal()
            this.close();
        }
    }
}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath?: string): void {
    const iconName = getIcon(field.type);

    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)?.openModal()
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${field.name}`,
            actionLabel: `<span>Update <b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        location.addOption(iconName, action, `Update ${field.name}'s value`);
    }
}