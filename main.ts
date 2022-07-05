import { Plugin, MarkdownView, Notice } from 'obsidian';
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import { MetadataMenuSettings, DEFAULT_SETTINGS } from "src/settings/MetadataMenuSettings";
import Field from 'src/Field';
import linkContextMenu from "src/options/linkContextMenu";
import NoteFieldsCommandsModal from "src/options/NoteFieldsCommandsModal";
import FileClassAttributeSelectModal from 'src/fileClass/FileClassAttributeSelectModal';
import ValueSuggest from "src/suggester/MetadataSuggester";

export default class MetadataMenu extends Plugin {
	settings: MetadataMenuSettings;
	initialProperties: Array<Field> = [];
	settingTab: MetadataMenuSettingTab;

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		await this.loadSettings();
		this.registerEditorSuggest(new ValueSuggest(this.app, this));

		this.settings.presetFields.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			this.initialProperties.push(property);
		});
		this.addSettingTab(new MetadataMenuSettingTab(this.app, this));


		this.addCommand({
			id: "field_options",
			name: "field options",
			hotkeys: [
				{
					modifiers: ["Alt"],
					key: 'O',
				},
			],
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (view?.file) {
					const fieldsOptionsModal = new NoteFieldsCommandsModal(this.app, this, view.file)
					fieldsOptionsModal.open()
				}
			},
		});

		/* TODO : add a context menu for fileClass files to show the same options as in FileClassAttributeSelectModal*/
		this.addCommand({
			id: "fileClassAttr_options",
			name: "fileClass attributes options",
			hotkeys: [
				{
					modifiers: ["Alt"],
					key: 'P',
				},
			],
			callback: () => {
				const leaf = this.app.workspace.activeLeaf
				if (leaf?.view instanceof MarkdownView && leaf.view.file && `${leaf.view.file.parent.path}/` == this.settings.classFilesPath) {
					const modal = new FileClassAttributeSelectModal(this, leaf.view.file)
					modal.open()
				} else {
					const notice = new Notice("This is not a fileClass", 2500)
				}
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
