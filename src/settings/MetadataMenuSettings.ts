import Field from "src/fields/Field";

export interface MetadataMenuSettings {
	presetFields: Array<Field>;
	displayFieldsInContextMenu: boolean;
	globallyIgnoredFields: Array<string>;
	classFilesPath: string;
	isAutosuggestEnabled: boolean;
	fileClassAlias: string;
	settingsVersion?: number;
	globalFileClass?: string;
	firstDayOfWeek: number;
}

export const DEFAULT_SETTINGS: MetadataMenuSettings = {
	presetFields: [],
	displayFieldsInContextMenu: true,
	globallyIgnoredFields: [],
	classFilesPath: "",
	isAutosuggestEnabled: true,
	fileClassAlias: "fileClass",
	settingsVersion: undefined,
	globalFileClass: undefined,
	firstDayOfWeek: 1
};