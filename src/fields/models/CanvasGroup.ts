
import { Constructor } from "src/typings/types";
import { getLink } from "src/utils/parser";
import { IFieldManager, Target, isSingleTargeted } from "../Field";
import { BaseOptions, IFieldBase } from "../base/BaseField";
import { ISettingsModal } from "../base/BaseSetting";
import * as AbstractCanvas from "./abstractModels/AbstractCanvas";

export class Base implements IFieldBase {
    type = <const>"CanvasGroup"
    tagName = "canvas-links"
    icon = "box-select"
    tooltip = "Updates with groups in canvas"
    colorClass = "file"
}

export interface Options extends AbstractCanvas.Options {
}

export interface DefaultedOptions extends Options {
    groupColors: string[]
    groupLabels: string[]
}

export const DefaultOptions: DefaultedOptions = {
    ...AbstractCanvas.DefaultOptions,
    groupColors: [],
    groupLabels: []
}

export function settingsModal(Base: Constructor<ISettingsModal<AbstractCanvas.DefaultedOptions>>): Constructor<ISettingsModal<Options>> {
    const base = AbstractCanvas.settingsModal(Base)
    return class SettingModal extends base {
        //options
        //initial values
        createSettingContainer(): void {
            //initial values
            const container = this.optionsContainer
            const options = this.field.options as DefaultedOptions
            options.groupColors = (options.groupColors as string[] | undefined) || []
            options.groupLabels = (options.groupLabels as string[] | undefined) || []

            //layout
            const canvasPathContainer = container.createDiv({ cls: "field-container" });
            container.createEl("hr");
            const groupColorsContainer = container.createDiv({ cls: "field-container colors" });
            const groupLabelsContainer = container.createDiv({ cls: "field-container labels" });
            const newLabelContainer = container.createDiv({ cls: "field-container" })

            //builders
            this.createCanvasPathContainer(canvasPathContainer)
            this.buildColorsContainer(groupColorsContainer, options.groupColors, "Groups matching colors:");
            this.buildLabelsContainer(groupLabelsContainer, options.groupLabels, "Groups matching labels: ");
            this.buildNewLabelContainer(groupLabelsContainer, "Groups matching labels: ", newLabelContainer, options.groupLabels, "Add a new matching group name")
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return AbstractCanvas.valueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractCanvas.displayValue(managedField, container, onClicked)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    return AbstractCanvas.validateValue(managedField)
}
