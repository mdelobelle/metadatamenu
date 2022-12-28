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

export default class CanvasField extends FieldManager {

    canvasPathInput: TextComponent;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Canvas)
    }

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClick: () => void): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            const dvValue = dvApi.page(file.path)[fieldName]
            const values = Array.isArray(dvValue) ? dvValue : [dvValue]
            values.forEach((value, i) => {
                if (dvApi.value.isLink(value)) {
                    const link = container.createEl('a', { text: value.path.split("/").last().replace(/(.*).md/, "$1") });
                    link.onclick = () => {
                        this.plugin.app.workspace.openLinkText(value.path, file.path, true)
                        onClick()
                    }
                } else {
                    container.createDiv({ text: value });
                }
                if (i < values.length - 1) {
                    container.createEl('span', { text: " | " })
                }
            })
        }
        container.createDiv()
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

        //direction
        options.direction = (options.direction as "incoming" | "outgoing" | "bothsides") || "bothsides"
        const directionContainer = container.createDiv({ cls: "field-container" });
        directionContainer.createDiv({ text: `Nodes to target from this note`, cls: "label" });
        directionContainer.createDiv({ cls: "spacer" });
        const directionSelection = new DropdownComponent(directionContainer);
        [
            ["incoming", "Incoming"],
            ["outgoing", "Outgoing"],
            ["bothsides", "Both sides"]
        ].forEach(([direction, label]) => directionSelection.addOption(direction, label));
        directionSelection.setValue(options.direction || "incoming")
        directionSelection.onChange(value => options.direction = value)

        //nodeColor
        const nodeColorsContainer = container.createDiv({ cls: "field-container colors" });

        //node query
        const filesFromDVQueryTopContainer = container.createDiv({ cls: "vstacked" })
        filesFromDVQueryTopContainer.createEl("span", { text: "Matching files" });
        filesFromDVQueryTopContainer.createEl("span", { text: "Dataview query returning a list of files (<dv> object is available)", cls: "sub-text" });
        const filesFromDVQueryContainer = filesFromDVQueryTopContainer.createDiv({ cls: "field-container" })
        const filesFromDVQuery = new TextAreaComponent(filesFromDVQueryContainer);
        filesFromDVQuery.inputEl.addClass("full-width");
        filesFromDVQuery.inputEl.cols = 65;
        filesFromDVQuery.inputEl.rows = 8;
        filesFromDVQuery.setPlaceholder("ex: dv.pages('#student').map(p => p.name)")
        filesFromDVQuery.setValue(options.filesFromDVQuery || "");
        filesFromDVQuery.onChange((value) => {
            options.filesFromDVQuery = value
        })

        //edge Color
        const edgeColorsContainer = container.createDiv({ cls: "field-container colors" });


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
                const altNodeColors: string[] = colorList && colorList.filter((color: string) => !standardColors.includes(color)) || []
                altNodeColors.forEach(color => {
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
        options.nodeColors = (options.nodeColors as string[] | undefined) || []
        options.edgeColors = (options.edgeColors as string[] | undefined) || []
        buildColorsContainer(nodeColorsContainer, options.nodeColors, "Node matching colors:");
        buildColorsContainer(edgeColorsContainer, options.edgeColors, "Edge matching colors:")

        // edges sides
        const edgeFromSidesContainer = container.createDiv({ cls: "field-container edges" })
        container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
        const edgeToSidesContainer = container.createDiv({ cls: "field-container egdes" })
        container.createDiv({ cls: "sub-text", text: "No edge selected is equivalent to all edges selected" })
        const sides: [string, string][] = [
            ["top", "chevron-up"],
            ["right", "chevron-right"],
            ["bottom", "chevron-down"],
            ["left", "chevron-left"]
        ]
        const buildEdgeSideContainer = (container: HTMLDivElement, edgeList: string[], label: string) => {
            container.createDiv({ cls: "label", text: label })
            container.createDiv({ cls: "spacer" })
            sides.forEach(([side, iconName]) => {
                edgeList = (edgeList as string[] | undefined) || sides.map(side => side[0])
                const edgeSideContainer = container.createDiv({ cls: "edge-side" })
                const sideIconContainer = edgeSideContainer.createDiv({ cls: "side-icon" })
                setIcon(sideIconContainer, iconName)
                const sideTogglerContainer = new ToggleComponent(edgeSideContainer);
                sideTogglerContainer.setValue(edgeList.includes(side))
                sideTogglerContainer.onChange(value => value ? edgeList.push(side) : edgeList.remove(side))
            })

        }
        options.edgeFromSides = (options.edgeFromSides as string[] | undefined) || []
        options.edgeToSides = (options.edgeToSides as string[] | undefined) || []
        buildEdgeSideContainer(edgeFromSidesContainer, options.edgeFromSides, "Edges matchin From side:")
        buildEdgeSideContainer(edgeToSidesContainer, options.edgeToSides, "Edges matchin To side:")

        //labels
        options.edgeLabels = (options.edgeLabels as string[] | undefined) || []
        const edgeLabelsContainer = container.createDiv({ cls: "field-container labels" });

        const buildLabelsContainer = () => {
            edgeLabelsContainer.replaceChildren(...[]);
            edgeLabelsContainer.createDiv({ cls: "label", text: "Edges matching labels: " });
            (options.edgeLabels as string[]).forEach(label => {
                const labelContainer = edgeLabelsContainer.createDiv({ cls: "item chip", text: label })
                new ButtonComponent(labelContainer)
                    .setIcon("x-circle")
                    .setClass("item-remove")
                    .onClick(() => {
                        options.edgeLabels.remove(label)
                        edgeLabelsContainer.removeChild(labelContainer)
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
            options.edgeLabels.push(labelInput.getValue());
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