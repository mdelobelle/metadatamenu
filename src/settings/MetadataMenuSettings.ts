import MetadataMenu from "main";
import { IField } from "src/fields/Field";
import { MultiDisplayType } from "src/fields/Fields";
import { BaseOptions } from "src/fields/base/BaseField";
import FileClassQuery from "src/fileClass/FileClassQuery";

export type UnboundField = Omit<IField<BaseOptions>, "plugin">

export interface MetadataMenuSettings {
	presetFields: Array<UnboundField>;
	fileClassQueries: Array<FileClassQuery>;
	displayFieldsInContextMenu: boolean;
	globallyIgnoredFields: Array<string>;
	classFilesPath: string | null;
	isAutosuggestEnabled: boolean;
	fileClassAlias: string;
	settingsVersion?: string | number;
	globalFileClass?: string;
	firstDayOfWeek: number;
	enableLinks: boolean;
	enableTabHeader: boolean;
	enableEditor: boolean;
	enableBacklinks: boolean;
	enableStarred: boolean;
	enableFileExplorer: boolean;
	enableSearch: boolean;
	enableProperties: boolean;
	tableViewMaxRecords: number;
	frontmatterListDisplay: MultiDisplayType;
	fileClassExcludedFolders: Array<string>;
	showIndexingStatusInStatusBar: boolean;
	fileIndexingExcludedFolders: Array<string>;
	fileIndexingExcludedExtensions: Array<string>;
	fileIndexingExcludedRegex: Array<string>;
	frontmatterOnly: boolean;
	showFileClassSelectInModal: boolean;
	ignoreDiacriticsInTableViewSearch: boolean;
	chooseFileClassAtFileCreation: boolean;
	autoInsertFieldsAtFileClassInsertion: boolean;
	fileClassIcon: string;
	isAutoCalculationEnabled: boolean
}

export const DEFAULT_SETTINGS: MetadataMenuSettings = {
	presetFields: [],
	fileClassQueries: [],
	displayFieldsInContextMenu: true,
	globallyIgnoredFields: [],
	classFilesPath: null,
	isAutosuggestEnabled: true,
	fileClassAlias: "fileClass",
	settingsVersion: undefined,
	globalFileClass: undefined,
	firstDayOfWeek: 1,
	enableLinks: true,
	enableTabHeader: true,
	enableEditor: true,
	enableBacklinks: true,
	enableStarred: true,
	enableFileExplorer: true,
	enableSearch: true,
	enableProperties: true,
	tableViewMaxRecords: 20,
	frontmatterListDisplay: MultiDisplayType.asArray,
	fileClassExcludedFolders: [],
	showIndexingStatusInStatusBar: true,
	fileIndexingExcludedFolders: [],
	fileIndexingExcludedExtensions: [".excalidraw.md"],
	fileIndexingExcludedRegex: [],
	frontmatterOnly: false,
	showFileClassSelectInModal: true,
	ignoreDiacriticsInTableViewSearch: true,
	chooseFileClassAtFileCreation: false,
	autoInsertFieldsAtFileClassInsertion: false,
	fileClassIcon: "package",
	isAutoCalculationEnabled: true
};

export const incrementVersion = (plugin: MetadataMenu) => {
	const currentVersion = plugin.settings.settingsVersion
	if (currentVersion && typeof currentVersion === "string") {
		const [x, y] = currentVersion.split(".");
		plugin.settings.settingsVersion = `${x}.${parseInt(y) + 1}`
	} else {
		plugin.settings.settingsVersion = "5.0"
	}
}