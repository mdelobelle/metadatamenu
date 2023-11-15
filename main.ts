import './env'
import { MarkdownView, Notice, Plugin } from 'obsidian';
import { addCommands } from 'src/commands/paletteCommands';
import ContextMenu from 'src/components/ContextMenu';
import ExtraButton from 'src/components/ExtraButton';
import FieldIndex from 'src/index/FieldIndex';
import IndexStatus from 'src/components/IndexStatus';
import Field from 'src/fields/Field';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import * as SettingsMigration from 'src/settings/migrateSetting';
import ValueSuggest from "src/suggester/metadataSuggester";
import { IndexDatabase } from 'src/db/DatabaseManager';
import { updatePropertiesSection } from 'src/options/updateProps';

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
	public indexDB: IndexDatabase;
	public indexName: string;
	public launched: boolean = false;

	async onload(): Promise<void> {
		console.log('+------ Metadata Menu loaded --------+');
		this.register(() => delete window.DEBUG);
		this.indexName = `metadata_menu_${this.app.appId ||
			this.app.vault.adapter.basePath ||
			this.app.vault.getName()}`;
		(window["MetadataMenuAPI"] = this.api) && this.register(() => delete window["MetadataMenuAPI"]);
		(window["MetadataMenu"] = this) && this.register(() => delete window["MetadataMenu"]);

		if (!this.app.plugins.enabledPlugins.has("dataview") || (
			//@ts-ignore
			this.app.plugins.plugins["dataview"] && !this.app.plugins.plugins["dataview"].settings.enableDataviewJs)
		) {
			new Notice(
				`------------------------------------------\n` +
				`(!) INFO (!) \n` +
				`Install and enable dataview and dataviewJS for extra Metadata Menu features\n` +
				`------------------------------------------`, 60000)
		}
		//loading and migrating settings
		await this.loadSettings();
		await SettingsMigration.migrateSettings(this)

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
				addCommands(this)
			})
		)

		this.registerEvent(
			this.app.workspace.on('metadata-menu:indexed', () => {
				this.indexStatus.setState("indexed")
				const currentView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (currentView) this.indexStatus.checkForUpdate(currentView)
				updatePropertiesSection(this)
				addCommands(this)
			})
		)

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				updatePropertiesSection(this)
				addCommands(this)
			})
		)

		//buildind index
		this.indexDB = this.addChild(new IndexDatabase(this))
		await this.fieldIndex.fullIndex(true)
		this.extraButton = this.addChild(new ExtraButton(this))
		this.launched = true

		//building palette commands
		addCommands(this)

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
