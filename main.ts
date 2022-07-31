import { Plugin, MarkdownView } from 'obsidian';
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import { MetadataMenuSettings, DEFAULT_SETTINGS } from "src/settings/MetadataMenuSettings";
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import Field from 'src/Field';
import linkContextMenu from "src/options/linkContextMenu";
import NoteFieldsCommandsModal from "src/options/NoteFieldsCommandsModal";
import FileClassAttributeSelectModal from 'src/fileClass/FileClassAttributeSelectModal';
import ValueSuggest from "src/suggester/metadataSuggester";
import { migrateSettingsV1toV2 } from 'src/settings/migrateSettingV1toV2';

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public settingTab: MetadataMenuSettingTab;

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		await this.loadSettings();
		if (this.settings.settingsVersion === undefined) {
			await migrateSettingsV1toV2(this)
		}

		this.settings.presetFields.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			this.initialProperties.push(property);
		});
		this.addSettingTab(new MetadataMenuSettingTab(this.app, this));

		this.registerEditorSuggest(new ValueSuggest(this.app, this));
		this.api = new MetadataMenuApi(this).make();

		this.addCommand({
			id: "field_options",
			name: "field options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file)
				}
				const fieldsOptionsModal = new NoteFieldsCommandsModal(this.app, this, view!.file)
				fieldsOptionsModal.open()
			},
		});

		/* TODO : add a context menu for fileClass files to show the same options as in FileClassAttributeSelectModal*/
		this.addCommand({
			id: "fileClassAttr_options",
			name: "fileClass attributes options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file) && `${view.file.parent.path}/` == this.settings.classFilesPath
				}
				const modal = new FileClassAttributeSelectModal(this, view!.file)
				modal.open()
			},
		});

		new linkContextMenu(this);
	};

	onunload() {
		console.log('Metadata Menu unloaded');
	};

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	};

	async saveSettings() {
		this.settings.presetFields = this.initialProperties;
		await this.saveData(this.settings);
	};
}
