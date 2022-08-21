import Field from "src/fields/Field";
import FileClassQuery from "src/fileClass/FileClassQuery";

export interface MetadataMenuSettings {
	presetFields: Array<Field>;
	fileClassQueries: Array<FileClassQuery>;
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
	fileClassQueries: [],
	displayFieldsInContextMenu: true,
	globallyIgnoredFields: [],
	classFilesPath: "",
	isAutosuggestEnabled: true,
	fileClassAlias: "fileClass",
	settingsVersion: undefined,
	globalFileClass: undefined,
	firstDayOfWeek: 1
};