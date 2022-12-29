import MetadataMenu from "main"
import { TFile, Menu, setIcon, ColorComponent, ToggleComponent, ButtonComponent, TextComponent, TextAreaComponent, DropdownComponent } from "obsidian"
import { postValues } from "src/commands/postValues"
import { FieldOptions } from "src/components/NoteFields"
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal"
import FieldSettingsModal from "src/settings/FieldSettingsModal"
import { FileSuggest } from "src/suggester/FileSuggester"
import { FieldType } from "src/types/fieldTypes"
import Field from "../Field"
import { FieldManager, SettingLocation } from "../FieldManager"

export default class CanvasGroupField extends FieldManager {

    canvasPathInput: TextComponent;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.CanvasGroup)
    }

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        //no field option to add for this field, it is automatically updated
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {
        await postValues(this.plugin, [{ name: this.field.name, payload: { value: "" } }], file, lineNumber, after, asList, asComment)
    }

    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined }): void {
        const fieldValue = dv.el('span', p[this.field.name], attrs);
        fieldContainer.appendChild(fieldValue);
    }

    createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        const options = this.field.options
        const standardColors = ["1", "2", "3", "4", "5", "6"]
        //canvas file
        const canvasPathContainer = container.createDiv({ cls: "field-container" });
        canvasPathContainer.createDiv({ text: `Path of the canvas`, cls: "label" });
        const canvasPathInput = new TextComponent(canvasPathContainer);
        canvasPathInput.inputEl.addClass("full-width");
        canvasPathInput.inputEl.addClass("with-label");
        new FileSuggest(
            canvasPathInput.inputEl,
            plugin,
            "/",
            "canvas"
        )
        const canvasPath = options.canvasPath;
        canvasPathInput.setValue(canvasPath || "");
        canvasPathInput.setPlaceholder("Path/of/the/file.canvas");
        canvasPathInput.onChange(value => {
            FieldSettingsModal.removeValidationError(canvasPathInput)
            options.canvasPath = value
        });
        this.canvasPathInput = canvasPathInput

        //groupColor
        const groupColorsContainer = container.createDiv({ cls: "field-container colors" });

        const buildColorsContainer = (container: HTMLDivElement, colorList: string[], label: string) => {
            container.replaceChildren(...[]);
            container.createEl("span", { text: label, cls: "label" });
            container.createDiv({ cls: "spacer" });
            const toggleStandardColorButton = (container: HTMLDivElement, color: string) => {
                if (colorList.includes(color)) {
                    container.addClass("active");
                    setIcon(container, "cross");
                } else {
                    container.removeClass("active");
                    setIcon(container, "plus");
                };
            }

            standardColors.forEach(color => {
                const colorContainer = container.createDiv({ cls: `node-color color-${color}` })
                toggleStandardColorButton(colorContainer, color)
                colorContainer.onmouseover = () => {
                    colorContainer.setAttr("style", `color: white`)
                }
                colorContainer.onmouseout = () => {
                    colorContainer.removeAttribute("style")
                }
                colorContainer.onclick = () => {
                    const colors = colorList as string[]
                    if (colors.includes(color)) {
                        colors.remove(color)
                    } else {
                        colors.push(color)
                    };
                    toggleStandardColorButton(colorContainer, color)

                }
            })

            const toggleAltColors = () => {
                const altGroupColors: string[] = colorList && colorList.filter((color: string) => !standardColors.includes(color)) || []
                altGroupColors.forEach(color => {
                    const colorContainer = container.createDiv({ cls: `node-color` })
                    colorContainer.setAttr("style", `background-color: ${color}; color: ${color}`)
                    colorContainer.onmouseover = () => {
                        colorContainer.setAttr("style", `background-color: ${color}; color: white`)
                    }
                    colorContainer.onmouseout = () => {
                        colorContainer.setAttr("style", `background-color: ${color}; color: ${color}`)
                    }
                    setIcon(colorContainer, "cross")
                    colorContainer.onclick = () => {
                        (colorList as string[]).remove(color);
                        container.removeChild(colorContainer);
                    }
                })
            }
            toggleAltColors()

            const altColorPickerContainer = container.createDiv({ cls: `node-color picker` })
            const altColorPicker = new ColorComponent(altColorPickerContainer);
            altColorPicker.onChange(value => {
                colorList.push(value);
                buildColorsContainer(container, colorList, label);
            })
        }
        options.groupColors = (options.groupColors as string[] | undefined) || []
        buildColorsContainer(groupColorsContainer, options.groupColors, "Groups matching colors:");

        //labels
        options.groupLabels = (options.groupLabels as string[] | undefined) || []
        const groupLabelsContainer = container.createDiv({ cls: "field-container labels" });

        const buildLabelsContainer = () => {
            groupLabelsContainer.replaceChildren(...[]);
            groupLabelsContainer.createDiv({ cls: "label", text: "Groups matching labels: " });
            (options.groupLabels as string[]).forEach(label => {
                const labelContainer = groupLabelsContainer.createDiv({ cls: "item chip", text: label })
                new ButtonComponent(labelContainer)
                    .setIcon("x-circle")
                    .setClass("item-remove")
                    .onClick(() => {
                        options.groupLabels.remove(label)
                        groupLabelsContainer.removeChild(labelContainer)
                    })
            })
        }
        buildLabelsContainer();

        const newLabelContainer = container.createDiv({ cls: "field-container" })
        newLabelContainer.createDiv({ cls: "label", text: "Add a new matching label" })
        newLabelContainer.createDiv({ cls: "spacer" })
        const labelInput = new TextComponent(newLabelContainer);
        const labelValidate = new ButtonComponent(newLabelContainer);
        labelInput.onChange(value => value ? labelValidate.setCta() : labelValidate.removeCta())
        labelValidate.setIcon("plus-circle")
        labelValidate.onClick(() => {
            options.groupLabels.push(labelInput.getValue());
            buildLabelsContainer();
            labelInput.setValue("")
            labelValidate.removeCta();
        })
    }

    getOptionsStr(): string {
        return ""
    }

    validateOptions(): boolean {
        let error = false;
        if (!(this.field.options.canvasPath as string)?.endsWith(".canvas")) {
            error = true;
            FieldSettingsModal.setValidationError(
                this.canvasPathInput,
                "This is not a canvas file"
            );
        }
        return !error
    }
}