import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { TextComponent, ButtonComponent, setIcon, DropdownComponent, TextAreaComponent, ColorComponent, ToggleComponent } from "obsidian";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import MetadataMenu from "main";
import { FileSuggest } from "src/suggester/FileSuggester";

export default abstract class AbstractListBasedField extends FieldManager {

    abstract canvasPathInput: TextComponent;
    protected standardColors = ["1", "2", "3", "4", "5", "6"]
    protected sides = [
        ["top", "chevron-up"],
        ["right", "chevron-right"],
        ["bottom", "chevron-down"],
        ["left", "chevron-left"]
    ]

    constructor(plugin: MetadataMenu, field: Field, type: FieldType) {
        super(plugin, field, type)
    }

    public buildColorsContainer = (container: HTMLDivElement, colorList: string[], label: string) => {
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

        this.standardColors.forEach(color => {
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
            const altGroupColors: string[] = colorList && colorList.filter((color: string) => !this.standardColors.includes(color)) || []
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
            this.buildColorsContainer(container, colorList, label);
        })
    }

    public buildEdgeSideContainer = (container: HTMLDivElement, edgeList: string[], label: string) => {
        container.createDiv({ cls: "label", text: label })
        container.createDiv({ cls: "spacer" })
        this.sides.forEach(([side, iconName]) => {
            edgeList = (edgeList as string[] | undefined) || this.sides.map(side => side[0])
            const edgeSideContainer = container.createDiv({ cls: "edge-side" })
            const sideIconContainer = edgeSideContainer.createDiv({ cls: "side-icon" })
            setIcon(sideIconContainer, iconName)
            const sideTogglerContainer = new ToggleComponent(edgeSideContainer);
            sideTogglerContainer.setValue(edgeList.includes(side))
            sideTogglerContainer.onChange(value => value ? edgeList.push(side) : edgeList.remove(side))
        })

    }

    public buildLabelsContainer = (container: HTMLDivElement, labels: string[], title: string) => {
        container.replaceChildren(...[]);
        container.createDiv({ cls: "label", text: title });
        (labels as string[]).forEach(label => {
            const labelContainer = container.createDiv({ cls: "item chip", text: label })
            new ButtonComponent(labelContainer)
                .setIcon("x-circle")
                .setClass("item-remove")
                .onClick(() => {
                    labels.remove(label)
                    container.removeChild(labelContainer)
                })
        })
    }

    public buildNewLabelContainer = (
        currentLabelsContainer: HTMLDivElement,
        currentLabelsTitle: string,
        newLabelContainer: HTMLDivElement,
        labels: string[],
        title: string
    ) => {
        newLabelContainer.createDiv({ cls: "label", text: title })
        newLabelContainer.createDiv({ cls: "spacer" })
        const labelInput = new TextComponent(newLabelContainer);
        const labelValidate = new ButtonComponent(newLabelContainer);
        labelInput.onChange(value => value ? labelValidate.setCta() : labelValidate.removeCta())
        labelValidate.setIcon("plus-circle")
        labelValidate.onClick(() => {
            labels.push(labelInput.getValue());
            this.buildLabelsContainer(currentLabelsContainer, labels, currentLabelsTitle);
            labelInput.setValue("")
            labelValidate.removeCta();
        })
    }

    public createCanvasPathContainer = (container: HTMLDivElement) => {
        container.createDiv({ text: `Path of the canvas`, cls: "label" });
        const canvasPathInput = new TextComponent(container);
        canvasPathInput.inputEl.addClass("full-width");
        canvasPathInput.inputEl.addClass("with-label");
        new FileSuggest(
            canvasPathInput.inputEl,
            this.plugin,
            "/",
            "canvas"
        )
        const canvasPath = this.field.options.canvasPath;
        canvasPathInput.setValue(canvasPath || "");
        canvasPathInput.setPlaceholder("Path/of/the/file.canvas");
        canvasPathInput.onChange(value => {
            FieldSettingsModal.removeValidationError(canvasPathInput)
            this.field.options.canvasPath = value
        });
        this.canvasPathInput = canvasPathInput
    }

    public createDirectionContainer = (container: HTMLDivElement, title: string) => {
        container.createDiv({ text: title, cls: "label" });
        container.createDiv({ cls: "spacer" });
        const directionSelection = new DropdownComponent(container);
        [
            ["incoming", "Incoming"],
            ["outgoing", "Outgoing"],
            ["bothsides", "Both sides"]
        ].forEach(([direction, label]) => directionSelection.addOption(direction, label));
        directionSelection.setValue(this.field.options.direction || "incoming")
        directionSelection.onChange(value => this.field.options.direction = value)
    }

    public createDvQueryContainer = (container: HTMLDivElement, title: string) => {
        container.createEl("span", { text: title });
        container.createEl("span", { text: "Dataview query returning a list of files (<dv> object is available)", cls: "sub-text" });
        const filesFromDVQueryContainer = container.createDiv({ cls: "field-container" })
        const filesFromDVQuery = new TextAreaComponent(filesFromDVQueryContainer);
        filesFromDVQuery.inputEl.addClass("full-width");
        filesFromDVQuery.inputEl.cols = 65;
        filesFromDVQuery.inputEl.rows = 3;
        filesFromDVQuery.setPlaceholder("ex: dv.pages('#student')")
        filesFromDVQuery.setValue(this.field.options.filesFromDVQuery || "");
        filesFromDVQuery.onChange((value) => {
            this.field.options.filesFromDVQuery = value
        })
    }
}