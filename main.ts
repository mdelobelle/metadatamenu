import { FileView, MarkdownView, Notice, Plugin, TFile, View } from 'obsidian';
import Field from 'src/fields/Field';
import FieldIndex from 'src/fields/FieldIndex';
import { FileClass } from 'src/fileClass/fileClass';
import { FileClassAttributeModal } from 'src/fileClass/FileClassAttributeModal';
import FileClassQuery from 'src/fileClass/FileClassQuery';
import type { IMetadataMenuApi } from 'src/MetadataMenuApi';
import { MetadataMenuApi } from 'src/MetadataMenuApi';
import FieldCommandSuggestModal from 'src/options/FieldCommandSuggestModal';
import FileClassOptionsList from 'src/options/FileClassOptionsList';
import linkContextMenu from "src/options/linkContextMenu";
import OptionsList from 'src/options/OptionsList';
import { DEFAULT_SETTINGS, MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import MetadataMenuSettingTab from "src/settings/MetadataMenuSettingTab";
import * as SettingsMigration from 'src/settings/migrateSetting';
import ValueSuggest from "src/suggester/metadataSuggester";
import { frontMatterLineField, getLineFields } from 'src/utils/parser';

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
	public settingTab: MetadataMenuSettingTab;
	public fieldIndex: FieldIndex;

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		await this.loadSettings();
		if (this.settings.settingsVersion === undefined) await SettingsMigration.migrateSettingsV1toV2(this)
		if (this.settings.settingsVersion === 2) await SettingsMigration.migrateSettingsV2toV3(this)


		this.fieldIndex = this.addChild(new FieldIndex(this, "1", () => { }))

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

		this.registerEditorSuggest(new ValueSuggest(this));
		this.api = new MetadataMenuApi(this).make();


		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const view = leaf?.view
				this.addCommands(view)
			})
		)

		this.addCommands(this.app.workspace.getActiveViewOfType(MarkdownView))

		new linkContextMenu(this);
	};

	private addFileClassAttributeOptions() {
		this.addCommand({
			id: "fileClassAttr_options",
			name: "fileClass attributes options",
			icon: "gear",
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
			icon: "list-plus",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (checking) {
					return !!(view?.file) && `${view.file.parent.path}/` == this.settings.classFilesPath
				}
				try {
					const fileClassAttributeModal = new FileClassAttributeModal(this, FileClass.createFileClass(this, view!.file.basename))
					fileClassAttributeModal.open()
				} catch (error) {
					new Notice("This is not a valid fileClass")
				}
			},
		});
	}

	private addInsertFieldAtPositionCommand() {
		this.addCommand({
			id: "insert_field_at_cursor",
			name: "insert field at cursor",
			icon: "list-plus",
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
			icon: "gear",
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

	private addManageFieldAtCursorCommand() {
		this.addCommand({
			id: "field_at_cursor_options",
			name: "Manage field at cursor",
			icon: "text-cursor-input",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const editor = view?.editor;
				if (checking) {
					const inFile = !!(view?.file && view.file.parent.path + "/" !== this.settings.classFilesPath)
					return inFile && editor !== undefined
				}
				const optionsList = new OptionsList(this, view!.file, "ManageAtCursorCommand")
				const frontmatter = this.app.metadataCache.getFileCache(view!.file)?.frontmatter;
				if (frontmatter && editor
					&& editor.getCursor().line > frontmatter.position.start.line
					&& editor.getCursor().line < frontmatter.position.end.line) {
					const attribute = frontMatterLineField(editor.getLine(editor.getCursor().line))
					if (attribute) optionsList.createAndOpenFieldModal(attribute)
				} else if (editor) {
					const { attribute, values } = getLineFields(editor.getLine(editor.getCursor().line)).find(field =>
						editor.getCursor().ch <= field.index + field.length
						&& editor.getCursor().ch >= field.index) || {};
					if (attribute) optionsList.createAndOpenFieldModal(attribute)
				}
			}

		})
	}

	private addUpdateLookups() {
		this.addCommand({
			id: "update_lookups",
			name: "Update lookup fields",
			icon: "file-search",
			checkCallback: (checking: boolean) => {
				if (checking) return true;
				this.fieldIndex.fullIndex("command", true);
			}
		})
	}

	private addCommands(view: View | undefined | null) {
		if (view && view instanceof FileView) {
			const file = this.app.vault.getAbstractFileByPath(view.file.path)
			if (file instanceof TFile && file.extension === 'md') {
				if (file.parent.path + "/" == this.settings.classFilesPath) {
					this.addFileClassAttributeOptions();
					this.addInsertFileClassAttribute();
				} else {
					this.addFieldCommand();
					this.addInsertFieldAtPositionCommand();
					this.addManageFieldAtCursorCommand()
				}
			}
		}
		this.addUpdateLookups()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	};


	async saveSettings() {
		this.settings.presetFields = this.initialProperties;
		this.settings.fileClassQueries = this.initialFileClassQueries;
		await this.saveData(this.settings);
		await this.fieldIndex.fullIndex("setting", true);
	};

	onunload() {
		console.log('Metadata Menu unloaded');
	};
}
