import MetadataMenu from "main";
import Field, { FieldCommand } from "src/fields/Field";
import FileClassQuery from "src/fileClass/FileClassQuery";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldType, MultiDisplayType } from "src/types/fieldTypes";

interface _Field {
	name: string,
	options: Record<string, any>,
	id: string,
	type: FieldType,
	fileClassName?: string,
	command?: FieldCommand,
	display?: MultiDisplayType,
	style?: Record<keyof typeof FieldStyleLabel, boolean>,
	path: string
}


export interface MetadataMenuSettings {
	presetFields: Array<_Field>;
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
	buttonIcon: string;
	tableViewMaxRecords: number;
	frontmatterListDisplay: MultiDisplayType;
	fileClassExcludedFolders: Array<string>;
	showIndexingStatusInStatusBar: boolean;
	fileIndexingExcludedFolders: Array<string>;
	fileIndexingExcludedExtensions: Array<string>;
	fileIndexingExcludedRegex: Array<string>;
	frontmatterOnly: boolean;
	showFileClassSelectInModal: boolean;
	chooseFileClassAtFileCreation: boolean;
	fileClassIcon: string;
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
	buttonIcon: "clipboard-list",
	tableViewMaxRecords: 20,
	frontmatterListDisplay: MultiDisplayType.asArray,
	fileClassExcludedFolders: [],
	showIndexingStatusInStatusBar: true,
	fileIndexingExcludedFolders: [],
	fileIndexingExcludedExtensions: [".excalidraw.md"],
	fileIndexingExcludedRegex: [],
	frontmatterOnly: false,
	showFileClassSelectInModal: true,
	chooseFileClassAtFileCreation: false,
	fileClassIcon: "package"
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