import Field from "src/Field"

export interface MetadataMenuSettings {
	presetFields: Array<Field>;
	displayFieldsInContextMenu: boolean;
	globallyIgnoredFields: Array<string>;
	getFromInlineField: boolean;
	classFilesPath: string;
}

export const DEFAULT_SETTINGS: MetadataMenuSettings = {
	presetFields: [],
	displayFieldsInContextMenu: true,
	globallyIgnoredFields: [],
	classFilesPath: "",
	getFromInlineField: true,
}