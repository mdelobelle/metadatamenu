import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Select)
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const modal = new SelectModal(this.plugin, file, value, this.field);
        modal.titleEl.setText("Select value");
        const action = () => modal.open()
        if (SelectField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.Select]);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            });
        } else if (SelectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.Select]
            });
        } else if (SelectField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.Multi], action, `Update ${name}'s value`);
        };
    };

    public createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean): void {
        const fieldModal = new SelectModal(this.plugin, file, value || "", this.field, lineNumber, inFrontmatter, after, asList, asComment);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): void {
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

        const values = this.getOptionsList();
        values.forEach(v => {
            const value = new Option(v, v)
            if (p[this.field.name] === v ||
                p[this.field.name] &&
                Object.keys(p[this.field.name]).includes("path") &&
                `[[${p[this.field.name].path.replace(".md", "")}]]` === v
            ) {
                value.selected = true;
            }
            select.add(value);
            select.onchange = async () => {
                let newValue = "";
                if (select.value !== undefined) {
                    newValue = select.value;
                }
                fieldContainer.removeChild(selectContainer)
                fieldContainer.appendChild(valueContainer)
                SelectField.replaceValues(this.plugin, p.file.path, this.field.name, newValue);
            }
        })

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