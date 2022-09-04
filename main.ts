import { FileView, MarkdownView, Plugin, TFile, View } from 'obsidian';
import { off } from 'process';
import { getField } from 'src/commands/getField';
import Field from 'src/fields/Field';
import { FieldManager as FM } from 'src/fields/FieldManager';
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
import { FieldManager } from 'src/types/fieldTypes';
import { genuineKeys } from 'src/utils/dataviewUtils';
import { frontMatterLineField, getLineFields } from 'src/utils/parser';

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

		this.addCommands(this.app.workspace.getActiveViewOfType(MarkdownView))

		new linkContextMenu(this);
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

	private addManageFieldAtCursorCommand() {
		this.addCommand({
			id: "field_at_cursor_options",
			name: "Manage field at cursor",
			checkCallback: (checking: boolean) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const editor = view?.editor;
				if (checking) {
					const inFile = !!(view?.file && view.file.parent.path + "/" !== this.settings.classFilesPath)
					return inFile && editor !== undefined
				}
				const frontmatter = this.app.metadataCache.getFileCache(view!.file)?.frontmatter;
				let fileClass: FileClass | undefined;
				if (frontmatter && view) {
					const { position, ...attributes } = frontmatter
					if (Object.keys(attributes).includes(this.settings.fileClassAlias)) {
						const fileClassName = attributes[this.settings.fileClassAlias];
						try {
							fileClass = FileClass.createFileClass(this, fileClassName);
						} catch (error) {
							//do nothing
						}
					}
				}
				let field: Field | undefined;
				if (frontmatter && editor
					&& editor.getCursor().line > frontmatter.position.start.line
					&& editor.getCursor().line < frontmatter.position.end.line) {
					//we are in the frontmatter
					const { position, ...attributes } = frontmatter
					const attribute = frontMatterLineField(editor.getLine(editor.getCursor().line))
					if (attribute) {
						field = getField(this, attribute, fileClass);
						if (field) {
							const fieldManager = new FieldManager[field.type](field);
							(fieldManager as FM).createAndOpenFieldModal(this.app, view.file, field.name, attributes[attribute])
						}
					}

				} else if (editor) {
					//we are in the body let's use dataview
					const { attribute, values } = getLineFields(editor.getLine(editor.getCursor().line)).find(field =>
						editor.getCursor().ch <= field.index + field.length
						&& editor.getCursor().ch >= field.index) || {};
					if (attribute) {
						field = getField(this, attribute, fileClass);
						const dataview = app.plugins.plugins["dataview"]
						//@ts-ignore
						let dvValue: any;
						if (dataview) {
							const dvFile = dataview.api.page(view.file.path)
							dvValue = dvFile[attribute]
						}
						if (field) {
							const fieldManager = new FieldManager[field.type](field);
							(fieldManager as FM).createAndOpenFieldModal(this.app, view.file, field.name, dvValue || values)
						}
					}
				}
			}

		})
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
					this.addManageFieldAtCursorCommand()
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

	onunload() {
		console.log('Metadata Menu unloaded');
	};
}
