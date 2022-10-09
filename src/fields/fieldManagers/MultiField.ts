import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import MultiSelectModal from "src/optionModals/fields/MultiSelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";

export default class MultiField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Multi)
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new MultiSelectModal(this.plugin, file, this.field, value);
        modal.titleEl.setText("Select values");
        if (MultiField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Multi]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            });
        } else if (MultiField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Multi]
            });
        };
    };

    public createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new MultiSelectModal(this.plugin, file, this.field, value || "", lineNumber, inFrontmatter, after);
        fieldModal.titleEl.setText(`Select options for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): void {
        /* 
        this control displays by default the list of value
        when mouseover: we display a "+" button at the beggining of the field to add a new value and a "x" button after the value hovered to remove it from list
        when the "x" button is clicked, we remove the list from value
        when the "+" button is clicked, we display a select dropdown filtered with remaining options. when one option is selected we add it to the list and remove the control
        */
        let valueHovered = false;
        let currentValues: string[] = [];
        if (p[this.field.name]) {
            if (Object.keys(p[this.field.name]).includes("path")) {
                currentValues = [`[[${p[this.field.name].path.replace(".md", "")}]]`]
            } else if (Array.isArray(p[this.field.name])) {
                currentValues.push(...p[this.field.name].map((v: string) => v.trim()))
            }
            else {
                currentValues = p[this.field.name].split(",").map((v: string) => v.trim());
            }
        }

        /* select container */
        const selectContainer = document.createElement("div");
        const select = document.createElement("select");
        select.setAttr("class", "metadata-menu-dv-select");
        selectContainer.appendChild(select)
        const nullOption = new Option("--select--", undefined);
        select.add(nullOption);
        const values = this.getOptionsList();
        values.filter(v => !currentValues.contains(v)).forEach(v => {
            const value = new Option(v, v);
            if (p[this.field.name] === value) {
                value.selected = true;
            }
            select.add(value);
        })
        select.onchange = async () => {
            const newValues = [...currentValues, select.value].join(", ");
            MultiField.replaceValues(this.plugin, p.file.path, this.field.name, newValues);
            singleSpacer.hide();
            doubleSpacer.show();
            addBtn.hide();
            fieldContainer.appendChild(valuesContainer);
            fieldContainer.appendChild(singleSpacer);
            fieldContainer.appendChild(doubleSpacer);
            fieldContainer.removeChild(selectContainer);
        }

        select.onkeydown = (e) => {
            if (e.key === 'Escape') {
                fieldContainer.appendChild(valuesContainer);
                fieldContainer.appendChild(singleSpacer);
                fieldContainer.appendChild(doubleSpacer);
                fieldContainer.removeChild(selectContainer);
            }
        }
        const closeSelect = document.createElement("button");
        setIcon(closeSelect, "cross");
        closeSelect.addClass("metadata-menu-dv-field-button");
        closeSelect.addClass("multi");
        closeSelect.onclick = () => {
            fieldContainer.appendChild(valuesContainer);
            fieldContainer.appendChild(singleSpacer);
            fieldContainer.appendChild(doubleSpacer);
            fieldContainer.removeChild(selectContainer);
        };
        selectContainer.appendChild(closeSelect);

        /* current values container */
        const valuesContainer = document.createElement("div");
        valuesContainer.addClass("metadata-menu-dv-multi-values-container");

        /* current values */
        currentValues.forEach(v => {
            const valueContainer = document.createElement("div");
            valueContainer.addClass("metadata-menu-dv-multi-values-container");


            const valueRemoveBtn = document.createElement("button");
            setIcon(valueRemoveBtn, "cross")
            valueRemoveBtn.addClass("metadata-menu-dv-field-button");
            valueRemoveBtn.addClass("multi");
            valueRemoveBtn.hide();
            valueRemoveBtn.onclick = async () => {
                const remainingValues = currentValues.filter(cV => cV !== v).join(", ")
                MultiField.replaceValues(this.plugin, p.file.path, this.field.name, remainingValues);
            }
            valueContainer.appendChild(valueRemoveBtn);

            const valueLabel = document.createElement("div");
            valueLabel.setText(v);
            valueLabel.addClass("metadata-menu-dv-multi-value-label");
            valueContainer.appendChild(valueLabel);

            valueContainer.onmouseover = () => {
                valueHovered = true;
                doubleSpacer.hide();
                singleSpacer.hide();
                valueRemoveBtn.show();
                valueLabel.addClass("hovered");
            }
            valueContainer.onmouseout = () => {
                valueHovered = false;
                valueRemoveBtn.hide();
                singleSpacer.show();
                doubleSpacer.hide();
                valueLabel.removeClass("hovered");
            }

            valuesContainer.appendChild(valueContainer);
        })

        /* button to display input */
        const addBtn = document.createElement("button");
        setIcon(addBtn, "bullet-list");
        addBtn.setAttr('class', "metadata-menu-dv-field-button");

        valuesContainer.appendChild(addBtn);
        addBtn.onclick = () => {
            fieldContainer.removeChild(valuesContainer);
            fieldContainer.removeChild(singleSpacer);
            fieldContainer.removeChild(doubleSpacer);
            fieldContainer.appendChild(selectContainer);
        }

        /* end spacer */
        const singleSpacer = document.createElement("div");
        singleSpacer.setAttr("class", "metadata-menu-dv-field-spacer")
        const doubleSpacer = document.createElement("div");
        doubleSpacer.setAttr("class", "metadata-menu-dv-field-double-spacer")

        if (!attrs?.options?.alwaysOn) {
            addBtn.hide();
            fieldContainer.onmouseover = () => {
                addBtn.show();
                doubleSpacer.hide();
                if (!valueHovered) singleSpacer.show();
            }
            fieldContainer.onmouseout = () => {
                addBtn.hide();
                singleSpacer.hide();
                doubleSpacer.show();
            }
        }

        /* initial state */
        if (!attrs?.options?.alwaysOn) {
            singleSpacer.hide();
            doubleSpacer.show();
            addBtn.hide();
        } else {
            singleSpacer.show();
            doubleSpacer.hide();
            addBtn.show();
        }
        fieldContainer.appendChild(valuesContainer);
        fieldContainer.appendChild(singleSpacer);
        fieldContainer.appendChild(doubleSpacer);
    }
}
