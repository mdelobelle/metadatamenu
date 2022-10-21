import { FileView, MarkdownView, Notice, Plugin, TFile, View, debounce } from 'obsidian';
import Field from 'src/fields/Field';
import FieldIndex from 'src/components/FieldIndex';
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
import { FileTaskManager } from 'src/components/FileTaskManager';
import {
	updateElLinks,
	updateVisibleLinks,
	clearExtraAttributes,
	updateDivExtraAttributes,
} from "src/options/linkAttributes"
import { Prec } from "@codemirror/state";
import { buildCMViewPlugin } from "src/options/livePreview";

export default class MetadataMenu extends Plugin {
	public api: IMetadataMenuApi;
	public settings: MetadataMenuSettings;
	public initialProperties: Array<Field> = [];
	public initialFileClassQueries: Array<FileClassQuery> = [];
	public settingTab: MetadataMenuSettingTab;
	public fieldIndex: FieldIndex;
	public fileTaskManager: FileTaskManager;
	private observers: [MutationObserver, string, string][];
	private modalObservers: MutationObserver[] = [];

	async onload(): Promise<void> {
		console.log('Metadata Menu loaded');
		await this.loadSettings();
		if (this.settings.settingsVersion === undefined) await SettingsMigration.migrateSettingsV1toV2(this)
		if (this.settings.settingsVersion === 2) await SettingsMigration.migrateSettingsV2toV3(this)


		this.fieldIndex = this.addChild(new FieldIndex(this, "1", () => { }))
		this.fileTaskManager = this.addChild(new FileTaskManager(this, "1", () => { }))

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

		this.registerMarkdownPostProcessor((el, ctx) => {
			updateElLinks(this.app, this, el, ctx)
		});

		const plugin = this;
		const updateLinks = function (_file: TFile) {
			updateVisibleLinks(plugin.app, plugin);
			plugin.observers.forEach(([observer, type, own_class]: [any, any, any]) => {
				const leaves = plugin.app.workspace.getLeavesOfType(type);
				leaves.forEach((leaf: any) => {
					plugin.updateContainer(leaf.view.containerEl, plugin, own_class, type);
				})
			});
		}

		// Live preview
		const ext = Prec.lowest(buildCMViewPlugin(this.app, this.settings));
		this.registerEditorExtension(ext);

		this.observers = [];

		this.app.workspace.onLayoutReady(() => {
			this.initViewObservers(this);
			this.initModalObservers(this, document);
			updateVisibleLinks(this.app, this);
		});

		// Initialization
		this.registerEvent(this.app.workspace.on("window-open", (window, win) => this.initModalObservers(this, window.getContainer()!.doc)));

		// Update when
		// Debounced to prevent lag when writing
		// @ts-ignore
		this.registerEvent(this.app.metadataCache.on('changed', debounce(updateLinks, 500, true)));

		// Update when layout changes
		// @ts-ignore
		this.registerEvent(this.app.workspace.on("layout-change", debounce(updateLinks, 10, true)));
		// Update plugin views when layout changes
		// TODO: This is an expensive operation that seems like it is called fairly frequently. Maybe we can do this more efficiently?
		this.registerEvent(this.app.workspace.on("layout-change", () => this.initViewObservers(this)));
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
		this.disconnectObservers();
		this.initModalObservers(this, document);
		this.initViewObservers(this);
		updateVisibleLinks(this.app, this);
	};

	initViewObservers(plugin: MetadataMenu) {
		// Reset observers
		plugin.observers.forEach(([observer, type]) => {
			observer.disconnect();
		});
		plugin.observers = [];

		// Register new observers
		plugin.registerViewType('backlink', plugin, ".tree-item-inner", true);
		plugin.registerViewType('outgoing-link', plugin, ".tree-item-inner", true);
		plugin.registerViewType('search', plugin, ".tree-item-inner", true);
		plugin.registerViewType('BC-matrix', plugin, '.BC-Link');
		plugin.registerViewType('BC-ducks', plugin, '.internal-link');
		plugin.registerViewType('BC-tree', plugin, 'a.internal-link');
		plugin.registerViewType('graph-analysis', plugin, '.internal-link');
		plugin.registerViewType('starred', plugin, '.nav-file-title-content', true);
		plugin.registerViewType('file-explorer', plugin, '.nav-file-title-content', true);
		plugin.registerViewType('recent-files', plugin, '.nav-file-title-content', true);
		// If backlinks in editor is on
		// @ts-ignore
		if (plugin.app?.internalPlugins?.plugins?.backlink?.instance?.options?.backlinkInDocument) {
			plugin.registerViewType('markdown', plugin, '.tree-item-inner', true);
		}
	}

	initModalObservers(plugin: MetadataMenu, doc: Document) {
		const config = {
			subtree: false,
			childList: true,
			attributes: false
		};

		this.modalObservers.push(new MutationObserver(records => {
			records.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach(n => {
						if ('className' in n &&
							// @ts-ignore
							(n.className.includes('modal-container') && plugin.settings.enableQuickSwitcher
								// @ts-ignore
								|| n.className.includes('suggestion-container') && plugin.settings.enableSuggestor)) {
							let selector = ".suggestion-title, .suggestion-note, .another-quick-switcher__item__title, .omnisearch-result__title";
							// @ts-ignore
							if (n.className.includes('suggestion-container')) {
								selector = ".suggestion-title, .suggestion-note";
							}
							plugin.updateContainer(n as HTMLElement, plugin, selector, null);
							plugin._watchContainer(null, n as HTMLElement, plugin, selector);
						}
					});
				}
			});
		}));
		this.modalObservers.last()?.observe(doc.body, config);
	}

	registerViewType(viewTypeName: string, plugin: MetadataMenu, selector: string, updateDynamic = false) {
		const leaves = this.app.workspace.getLeavesOfType(viewTypeName);
		if (leaves.length > 1) {
			for (let i = 0; i < leaves.length; i++) {
				const container = leaves[i].view.containerEl;
				if (updateDynamic) {
					plugin._watchContainerDynamic(viewTypeName + i, container, plugin, selector)
				}
				else {
					plugin._watchContainer(viewTypeName + i, container, plugin, selector);
				}
			}
		}
		else if (leaves.length < 1) return;
		else {
			const container = leaves[0].view.containerEl;
			this.updateContainer(container, plugin, selector, viewTypeName);
			if (updateDynamic) {
				plugin._watchContainerDynamic(viewTypeName, container, plugin, selector)
			}
			else {
				plugin._watchContainer(viewTypeName, container, plugin, selector);
			}
		}
	}

	updateContainer(container: HTMLElement, plugin: MetadataMenu, selector: string, viewTypeName: string | null) {
		const nodes = container.findAll(selector);
		for (let i = 0; i < nodes.length; ++i) {
			const el = nodes[i] as HTMLElement;
			updateDivExtraAttributes(plugin.app, plugin, el, viewTypeName, "");
		}
	}

	removeFromContainer(container: HTMLElement, selector: string) {
		const nodes = container.findAll(selector);
		for (let i = 0; i < nodes.length; ++i) {
			const el = nodes[i] as HTMLElement;
			clearExtraAttributes(el);
		}
	}

	_watchContainer(viewType: string | null, container: HTMLElement, plugin: MetadataMenu, selector: string) {
		let observer = new MutationObserver((records, _) => {
			plugin.updateContainer(container, plugin, selector, viewType);
		});
		observer.observe(container, { subtree: true, childList: true, attributes: false });
		if (viewType) {
			plugin.observers.push([observer, viewType, selector]);
		}
	}

	_watchContainerDynamic(viewType: string, container: HTMLElement, plugin: MetadataMenu, selector: string, ownClass = 'tree-item-inner', parent_class = 'tree-item') {
		// Used for efficient updating of the backlinks panel
		// Only loops through newly added DOM nodes instead of changing all of them
		let observer = new MutationObserver((records, _) => {
			records.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((n) => {
						if ('className' in n) {
							// @ts-ignore
							if (n.className.includes && typeof n.className.includes === 'function' && n.className.includes(parent_class)) {
								const fileDivs = (n as HTMLElement).getElementsByClassName(ownClass);
								for (let i = 0; i < fileDivs.length; ++i) {
									const link = fileDivs[i] as HTMLElement;
									updateDivExtraAttributes(plugin.app, plugin, link, viewType, "");
								}
							}
						}
					});
				}
			});
		});
		observer.observe(container, { subtree: true, childList: true, attributes: false });
		plugin.observers.push([observer, viewType, selector]);
	}

	disconnectObservers() {
		this.observers.forEach(([observer, type, own_class]) => {
			observer.disconnect();
			const leaves = this.app.workspace.getLeavesOfType(type);
			leaves.forEach(leaf => {
				this.removeFromContainer(leaf.view.containerEl, own_class);
			})
		});
		for (const observer of this.modalObservers) {
			observer.disconnect();
		}
	}

	onunload() {
		this.disconnectObservers();
		console.log('Metadata Menu unloaded');
	};
}
