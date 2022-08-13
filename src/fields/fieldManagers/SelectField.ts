import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { App, Menu, TFile, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import valueSelectModal from "src/optionModals/valueSelectModal";
import FieldSetting from "src/settings/FieldSetting";

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Select)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new valueSelectModal(app, file, value, this.field);
        modal.titleEl.setText("Select value");
        if (SelectField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon('right-triangle');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            });
        } else if (SelectField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueSelectModal(app, file, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }


    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): Promise<void> {
        const valueContainer = document.createElement("div");;
        const valueLabel = dv.el("span", p[this.field.name] || "");
        valueContainer.appendChild(valueLabel);
        const dropDownButton = document.createElement("button");
        dropDownButton.setText("🔽");
        dropDownButton.addClass("metadata-menu-dv-field-button");
        valueContainer.appendChild(dropDownButton);


        const selectContainer = document.createElement("div");
        const select = document.createElement("select");
        select.setAttr("class", "metadata-menu-dv-select");
        selectContainer.appendChild(select);
        const dismissBtn = document.createElement("button");
        dismissBtn.setText("❌");
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
                    console.log(select.value)
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
        fieldContainer.appendChild(valueContainer);
    }
}