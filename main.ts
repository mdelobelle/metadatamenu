import { MarkdownView, Notice, Plugin } from 'obsidian';
import { addCommands } from 'src/commands/paletteCommands';
import ContextMenu from 'src/components/ContextMenu';
import ExtraButton from 'src/components/ExtraButton';
import FieldIndex from 'src/components/FieldIndex';
import FileTaskManager from 'src/components/FileTaskManager';
import Field from 'src/fields/Field';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import * as SettingsMigration from 'src/settings/migrateSetting';
import ValueSuggest from "src/suggester/metadataSuggester";

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
	public settingTab: MetadataMenuSettingTab;
	public fieldIndex: FieldIndex;
	public fileTaskManager: FileTaskManager;
	public extraButton: ExtraButton;
	public contextMenu: ContextMenu;

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		if (!this.app.plugins.enabledPlugins.has("dataview") || (
			//@ts-ignore
			this.app.plugins.plugins["dataview"] && !this.app.plugins.plugins["dataview"].settings.enableDataviewJs)
		) {
			new Notice(
				`------------------------------------------\n` +
				`/!\\ INFO /!\\ \n` +
				`Please install and enable dataview and dataviewJS to use Metadata Menu\n` +
				`------------------------------------------`, 60000)
		}
		//loading and migrating settings
		await this.loadSettings();
		if (this.settings.settingsVersion === undefined) await SettingsMigration.migrateSettingsV1toV2(this)
		if (this.settings.settingsVersion === 2) await SettingsMigration.migrateSettingsV2toV3(this)
		if (this.settings.settingsVersion === 3) await SettingsMigration.migrateSettingsV3toV4(this)

		//loading components
		this.fieldIndex = this.addChild(new FieldIndex(this, "1", () => { }))
		this.fileTaskManager = this.addChild(new FileTaskManager(this, "1", () => { }))
		this.extraButton = this.addChild(new ExtraButton(this, "1", () => { }))
		this.contextMenu = this.addChild(new ContextMenu(this))

		//building settings tab
		this.settings.presetFields.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			this.initialProperties.push(property);
		});

		this.settings.fileClassQueries.forEach(query => {
			const fileClassQuery = new FileClassQuery();
			Object.assign(fileClassQuery, query);
			this.initialFileClassQueries.push(fileClassQuery);
		})

		this.addSettingTab(new MetadataMenuSettingTab(this));

		//registering Metadata Menu suggestor for live preview
		this.registerEditorSuggest(new ValueSuggest(this));
		this.api = new MetadataMenuApi(this).make();

		//registering palette command re-build on leaf change
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const view = leaf?.view
				addCommands(this, view);
			})
		)
		this.registerEvent(
			this.app.workspace.on('metadata-menu:indexed', () => {
				addCommands(this, undefined);
			})
		)

		//building palette commands
		addCommands(this, this.app.workspace.getActiveViewOfType(MarkdownView));
	};

	/*
	------------
	Settings
	------------
	*/

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	};

	async saveSettings() {
		this.settings.presetFields = this.initialProperties;
		this.settings.fileClassQueries = this.initialFileClassQueries;
		await this.saveData(this.settings);
		await this.fieldIndex.fullIndex("setting", true, false);
		this.extraButton.reloadObservers();
	};

	onunload() {
		console.log('Metadata Menu unloaded');
	};
}
