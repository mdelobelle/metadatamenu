import MetadataMenu from "main";
import { App, Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/optionModals/FieldCommandSuggestModal";
import SelectModal from "src/optionModals/fields/SelectModal";
import FieldSelectModal from "src/optionModals/SelectModal";
import FieldSetting from "src/settings/FieldSetting";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Select)
    }

    addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldSelectModal | FieldCommandSuggestModal): void {
        const modal = new SelectModal(app, file, value, this.field);
        modal.titleEl.setText("Select value");
        if (SelectField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.Select]);
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            });
        } else if (SelectField.isSelect(location)) {
            location.addOption(`update_${name}`, `Update <${name}>`);
            location.modals[`update_${name}`] = () => modal.open();
        } else if (SelectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Select]
            });
        };
    };

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new SelectModal(app, file, "", this.field, lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }


    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): Promise<void> {
        const valueContainer = document.createElement("div");;
        const valueLabel = dv.el("span", p[this.field.name] || "");
        valueContainer.appendChild(valueLabel);
        const dropDownButton = document.createElement("button");
        setIcon(dropDownButton, "down-chevron-glyph");
        dropDownButton.addClass("metadata-menu-dv-field-button");
        valueContainer.appendChild(dropDownButton);


        const selectContainer = document.createElement("div");
        const select = document.createElement("select");
        select.setAttr("class", "metadata-menu-dv-select");
        selectContainer.appendChild(select);
        const dismissBtn = document.createElement("button");
        setIcon(dismissBtn, "cross");
        dismissBtn.addClass("metadata-menu-dv-field-button");
        selectContainer.appendChild(dismissBtn);
        const nullOption = new Option("--select--", undefined);
        select.add(nullOption);
        const listNoteValues = await FieldSetting.getValuesListFromNote(this.field.valuesListNotePath, plugin.app)
        if (listNoteValues.length) {
            listNoteValues.forEach(o => {
                const option = new Option(o, o);
                if (p[this.field.name] === o ||
                    p[this.field.name] &&
                    Object.keys(p[this.field.name]).includes("path") &&
                    `[[${p[this.field.name].path.replace(".md", "")}]]` === o
                ) {
                    option.selected = true;
                }
                select.add(option);
                select.onchange = () => {
                    let newValue = "";
                    if (select.value !== undefined) {
                        newValue = select.value;
                    }
                    fieldContainer.removeChild(selectContainer)
                    fieldContainer.appendChild(valueContainer)
                    SelectField.replaceValues(plugin.app, p["file"]["path"], this.field.name, newValue);
                }
            });
        } else {
            Object.keys(this.field.options).forEach(o => {
                const option = new Option(this.field.options[o], o);
                if (p[this.field.name] === this.field.options[o] ||
                    p[this.field.name] &&
                    Object.keys(p[this.field.name]).includes("path") &&
                    `[[${p[this.field.name].path.replace(".md", "")}]]` === this.field.options[o]
                ) {
                    option.selected = true;
                }
                select.add(option);
                select.onchange = () => {
                    let newValue = "";
                    if (select.value !== undefined) {
                        newValue = this.field.options[select.value]
                    }
                    fieldContainer.removeChild(selectContainer)
                    fieldContainer.appendChild(valueContainer)
                    SelectField.replaceValues(plugin.app, p["file"]["path"], this.field.name, newValue);
                }
            })
        }

        dropDownButton.onclick = () => {
            fieldContainer.removeChild(valueContainer);
            fieldContainer.appendChild(selectContainer);
        }

        dismissBtn.onclick = () => {
            fieldContainer.removeChild(selectContainer);
            fieldContainer.appendChild(valueContainer)
        }

        /* initial state */
        if (!attrs?.options?.alwaysOn) {
            fieldContainer.appendChild(valueContainer);
        } else {
            fieldContainer.appendChild(selectContainer);
        }
    }
}