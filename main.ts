import { FileView, MarkdownView, Plugin, TFile, View } from 'obsidian';
import Field from 'src/fields/Field';
import { FileClass } from 'src/fileClass/fileClass';
import { FileClassAttributeModal } from 'src/fileClass/FileClassAttributeModal';
import FileClassAttributeSelectModal from 'src/fileClass/FileClassAttributeSelectModal';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import FieldCommandSuggestModal from 'src/options/FieldCommandSuggestModal';
import FileClassOptionsList from 'src/options/FileClassOptionsList';
import linkContextMenu from "src/options/linkContextMenu";
import OptionsList from 'src/options/OptionsList';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import { migrateSettingsV1toV2 } from 'src/settings/migrateSettingV1toV2';
import ValueSuggest from "src/suggester/metadataSuggester";

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
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

		this.settings.fileClassQueries.forEach(query => {
			const fileClassQuery = new FileClassQuery();
			Object.assign(fileClassQuery, query);
			this.initialFileClassQueries.push(fileClassQuery);
		})

		this.addSettingTab(new MetadataMenuSettingTab(this.app, this));

		this.registerEditorSuggest(new ValueSuggest(this.app, this));
		this.api = new MetadataMenuApi(this).make();


		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const view = leaf?.view
				this.addCommands(view)
			})
		)

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {

				//@ts-ignore
				menu.setSectionSubmenu("view.linked", { title: "Open linked view", icon: "lucide-link" })
				menu.addItem((item) => {
					item.setTitle("truc")
					item.setSection("view.linked")
				})
				menu.addItem((subItem) => {
					subItem.setTitle("machin")
					subItem.setSection("view.linked")
				})
			})
		)

		this.addCommands(this.app.workspace.getActiveViewOfType(MarkdownView))

		new linkContextMenu(this);
	};

	onunload() {
		console.log('Metadata Menu unloaded');
	};

	private addFileClassAttributeOptions() {
		this.addCommand({
			id: "fileClassAttr_options",
			name: "fileClass attributes options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file) && `${view.file.parent.path}/` == this.settings.classFilesPath
				}
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.app)
				const optionsList = new FileClassOptionsList(this, view!.file, fieldCommandSuggestModal);
				optionsList.createExtraOptionList();
			},
		});
	}

	private addInsertFileClassAttribute() {
		this.addCommand({
			id: "insert_fileClassAttr",
			name: "Insert a new fileClass attribute",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file) && `${view.file.parent.path}/` == this.settings.classFilesPath
				}
				const fileClassAttributeModal = new FileClassAttributeModal(this, FileClass.createFileClass(this, view!.file.basename))
				fileClassAttributeModal.open()
			},
		});
	}

	private addInsertFieldAtPositionCommand() {
		this.addCommand({
			id: "insert_field_at_cursor",
			name: "insert field at cursor",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file && view.file.parent.path + "/" !== this.settings.classFilesPath)
				}
				const optionsList = new OptionsList(this, view!.file, "InsertFieldCommand");
				optionsList.createExtraOptionList();
			}
		})
	}

	private addFieldCommand() {
		this.addCommand({
			id: "field_options",
			name: "field options",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file && view.file.parent.path + "/" !== this.settings.classFilesPath)
				}
				const fieldCommandSuggestModal = new FieldCommandSuggestModal(this.app)
				const optionsList = new OptionsList(this, view!.file, fieldCommandSuggestModal);
				optionsList.createExtraOptionList();
			},
		});
	}

	private addCommands(view: View | undefined | null) {
		if (view && view instanceof FileView) {
			const file = app.vault.getAbstractFileByPath(view.file.path)
			if (file instanceof TFile && file.extension === 'md') {
				if (file.parent.path + "/" == this.settings.classFilesPath) {
					this.addFileClassAttributeOptions();
					this.addInsertFileClassAttribute();
				} else {
					this.addFieldCommand();
					this.addInsertFieldAtPositionCommand();
				}
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	};

	async saveSettings() {
		this.settings.presetFields = this.initialProperties;
		this.settings.fileClassQueries = this.initialFileClassQueries;
		await this.saveData(this.settings);
	};
}
