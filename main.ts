import './env'
import { MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { addCommands } from 'src/commands/paletteCommands';
import ContextMenu from 'src/components/ContextMenu';
import ExtraButton from 'src/components/ExtraButton';
import FieldIndex from 'src/index/FieldIndex';
import IndexStatus from 'src/components/IndexStatus';
import Field from 'src/fields/_Field';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import * as SettingsMigration from 'src/settings/migrateSetting';
import ValueSuggest from "src/suggester/metadataSuggester";
import { updatePropertiesSection } from 'src/options/updateProps';
import { FileClassFolderButton } from 'src/fileClass/fileClassFolderButton';
import { FileClassViewManager } from 'src/components/FileClassViewManager';
import { IndexDatabase } from 'src/db/DatabaseManager';
import { FileClassCodeBlockManager } from 'src/components/FileClassCodeBlockManager';
import { AddFileClassToFileModal } from 'src/fileClass/fileClass';
import { FileClassCodeBlockListManager } from 'src/components/FileClassCodeBlockListManager';

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
	public indexDB: IndexDatabase;
	public codeBlockListManager: FileClassCodeBlockListManager

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
		this.codeBlockListManager = this.addChild(new FileClassCodeBlockListManager(this))
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

		this.api = new MetadataMenuApi(this).make();

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (!this.fieldIndex.fileClassesName.size) return
				if (file instanceof TFile && file.extension === "md" && this.settings.chooseFileClassAtFileCreation) {
					const modal = new AddFileClassToFileModal(this, file)
					modal.open()
				}
			})
		)

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf) this.indexStatus.checkForUpdate(leaf.view)
			})
		)

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				updatePropertiesSection(this)
			})
		)

		this.registerEvent(
			this.app.metadataCache.on('metadata-menu:indexed', () => {
				this.indexStatus.setState("indexed")
				const currentView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (currentView) this.indexStatus.checkForUpdate(currentView)
				updatePropertiesSection(this)
				FileClassViewManager.reloadViews(this)
			})
		)

		this.indexDB = this.addChild(new IndexDatabase(this))
		//buildind index
		await this.fieldIndex.fullIndex()
		this.extraButton = this.addChild(new ExtraButton(this))
		if (this.settings.enableFileExplorer) this.addChild(new FileClassFolderButton(this))
		this.registerEditorSuggest(new ValueSuggest(this));
		this.launched = true
		//building palette commands
		addCommands(this)

		this.registerMarkdownCodeBlockProcessor("mdm", async (source, el, ctx) => {
			const fileClassCodeBlockManager = new FileClassCodeBlockManager(this, el, source, ctx)
			this.codeBlockListManager.addChild(fileClassCodeBlockManager)
			ctx.addChild(fileClassCodeBlockManager)
		});
		this.app.workspace.trigger("layout-change")
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
		await this.fieldIndex.fullIndex();
	};

	onunload() {
		console.log('x------ Metadata Menu unloaded ------x');
		FileClassFolderButton.removeBtn(this)
	};
}
