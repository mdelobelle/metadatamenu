import Field from "src/Field"

export interface MetadataMenuSettings {
	presetFields: Array<Field>;
	displayFieldsInContextMenu: boolean;
	globallyIgnoredFields: Array<string>;
	getFromInlineField: boolean;
	classFilesPath: string;
	enableEditor: boolean;
	enableFileList: boolean;
	enableBacklinks: boolean;
	enableQuickSwitcher: boolean;
	enableSuggestor: boolean;
}

export const DEFAULT_SETTINGS: MetadataMenuSettings = {
	presetFields: [],
	displayFieldsInContextMenu: true,
	globallyIgnoredFields: [],
	classFilesPath: "",
	getFromInlineField: true,
	enableEditor: true,
	enableFileList: true,
	enableBacklinks: true,
	enableQuickSwitcher: true,
	enableSuggestor: true
}