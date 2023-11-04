import { debounce, MarkdownView, Notice, Plugin } from 'obsidian';
import { addCommands } from 'src/commands/paletteCommands';
import ContextMenu from 'src/components/ContextMenu';
import ExtraButton from 'src/components/ExtraButton';
import FieldIndex from 'src/components/FieldIndex';
import IndexStatus from 'src/components/IndexStatus';
import Field from 'src/fields/Field';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import * as SettingsMigration from 'src/settings/migrateSetting';
import ValueSuggest from "src/suggester/metadataSuggester";
import initDb from "src/db/index"
import { updateVisibleLinks } from 'src/options/linkAttributes';

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public presetFields: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
	public settingTab: MetadataMenuSettingTab;
	public fieldIndex: FieldIndex;
	public extraButton: ExtraButton;
	public contextMenu: ContextMenu;
	public indexStatus: IndexStatus;
	public indexName: string;
	public launched: boolean = false;

	async onload(): Promise<void> {
		console.log('+------ Metadata Menu loaded --------+');
		this.indexName = `metadata_menu_${this.app.vault.adapter.basePath || this.app.vault.getName()}`
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

		this.indexStatus = this.addChild(new IndexStatus(this))
		if (this.settings.showIndexingStatusInStatusBar) this.indexStatus.load()

		this.fieldIndex = this.addChild(new FieldIndex(this))
		this.contextMenu = this.addChild(new ContextMenu(this))

		//building settings tab
		this.settings.presetFields.forEach(prop => {
			const property = new Field(this);
			Object.assign(property, prop);
			this.presetFields.push(property);
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

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf) this.indexStatus.checkForUpdate(leaf.view)
			})
		)
		this.registerEvent(
			this.app.workspace.on('metadata-menu:indexed', () => {
				this.indexStatus.setState("indexed")
				const currentView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (currentView) this.indexStatus.checkForUpdate(currentView)
			})
		)

		//building palette commands
		addCommands(this)

		//indexing
		initDb(this);
		await this.fieldIndex.fullIndex(true)
		this.extraButton = this.addChild(new ExtraButton(this))
		this.launched = true
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

		//remove the 'plugin' attribute from the Field object before writing the field to the settings
		this.settings.presetFields = this.presetFields.map(_field => { const { plugin, ...field } = _field; return field });
		this.settings.fileClassQueries = this.initialFileClassQueries;
		await this.saveData(this.settings);
		await this.fieldIndex.fullIndex(true);
	};

	onunload() {
		console.log('x------ Metadata Menu unloaded ------x');
	};
}
function updateLinks(updateLinks: any, arg1: number, arg2: boolean) {
	throw new Error('Function not implemented.');
}

