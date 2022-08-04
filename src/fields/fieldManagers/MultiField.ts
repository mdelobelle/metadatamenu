import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { App, Menu, TFile, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import valueMultiSelectModal from "src/optionModals/valueMultiSelectModal";

export default class MultiField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Multi)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new valueMultiSelectModal(app, file, name, value, this.field);
        modal.titleEl.setText("Select values");
        if (MultiField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon('bullet-list');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            });
        } else if (MultiField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueMultiSelectModal(app, file, this.field.name, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select options for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
        /* 
        this control displays by default the list of value
        when mouseover: we display a "+" button at the beggining of the field to add a new value and a "x" button after the value hovered to remove it from list
        when the "x" button is clicked, we remove the list from value
        when the "+" button is clicked, we display a select dropdown filtered with remaining options. when one option is selected we add it to the list and remove the control
        */
        let valueHovered = false;
        const currentValues = (p[this.field.name] as string).split(",").map(v => v.trim());

        /* select container */
        const selectContainer = document.createElement("div");
        const select = document.createElement("select");
        select.setAttr("class", "metadata-menu-dv-select");
        selectContainer.appendChild(select)
        const nullOption = new Option("--select--", undefined);
        select.add(nullOption);
        Object.keys(this.field.options)
            .filter(o => !currentValues.contains(this.field.options[o]))
            .forEach(o => {
                const option = new Option(this.field.options[o], o);
                if (p[this.field.name] === this.field.options[o]) {
                    option.selected = true;
                }
                select.add(option);
            })
        select.onchange = () => {
            const newValues = [...currentValues, this.field.options[select.value]].join(", ");
            MultiField.replaceValues(plugin.app, p["file"]["path"], this.field.name, newValues)
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

        /* current values container */
        const valuesContainer = document.createElement("div");
        valuesContainer.addClass("metadata-menu-dv-multi-values-container");

        /* current values */
        currentValues.forEach(v => {
            const valueContainer = document.createElement("div");
            valueContainer.addClass("metadata-menu-dv-multi-value-container");


            const valueRemoveBtn = document.createElement("button");
            valueRemoveBtn.setText("❌");
            valueRemoveBtn.addClass("metadata-menu-dv-field-button");
            valueRemoveBtn.addClass("multi");
            valueRemoveBtn.hide();
            valueRemoveBtn.onclick = () => {
                const remainingValues = currentValues.filter(cV => cV !== v).join(", ")
                MultiField.replaceValues(plugin.app, p["file"]["path"], this.field.name, remainingValues);
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
        addBtn.setText("➕");
        addBtn.setAttr('class', "metadata-menu-dv-field-button");
        addBtn.hide();
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

        /* initial state */
        singleSpacer.hide();
        doubleSpacer.show();
        addBtn.hide();
        fieldContainer.appendChild(valuesContainer);
        fieldContainer.appendChild(singleSpacer);
        fieldContainer.appendChild(doubleSpacer);
    }
}