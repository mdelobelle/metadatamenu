import { PluginSettingTab, Setting, ButtonComponent, ToggleComponent, Modal, DropdownComponent, moment, setIcon } from "obsidian";
import MetadataMenu from "main";
import FieldSetting from "src/settings/FieldSetting";
import { FolderSuggest } from "src/suggester/FolderSuggester";
import { FileSuggest } from "src/suggester/FileSuggester";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FileClassQuerySettingsModal from "./FileClassQuerySettingModal";
import FileClassQuerySetting from "./FileClassQuerySetting";
import { MultiDisplayType } from "src/types/fieldTypes";
import { DEFAULT_SETTINGS } from "./MetadataMenuSettings";
import { openSettings } from "src/fields/base/BaseSetting";
import { buildEmptyField } from "src/fields/Field";

class SettingTextWithButtonComponent extends Setting {
	private newValues: string[] = []
	constructor(
		private plugin: MetadataMenu,
		private containerEl: HTMLElement,
		private name: string,
		private description: string,
		private placeholder: string,
		private currentValues:
			"fileIndexingExcludedFolders" |
			"fileIndexingExcludedExtensions" |
			"globallyIgnoredFields" |
			"fileIndexingExcludedRegex" |
			"fileClassExcludedFolders",
		private normalizeValue: (item: string) => string
	) {
		super(containerEl)
		const saveButton = new ButtonComponent(this.containerEl)
		saveButton.buttonEl.addClass("save")
		saveButton.setIcon("save")
		saveButton.onClick(async () => {
			this.plugin.settings[this.currentValues] = this.newValues
			await this.plugin.saveSettings()
			saveButton.removeCta()
		})
		this
			.setName(this.name)
			.setDesc(this.description)
			.addTextArea((text) => {
				text
					.setPlaceholder(this.placeholder)
					.setValue(this.plugin.settings[this.currentValues].join(', '))
					.onChange(async (value) => {
						saveButton.setCta()
						const values = value.split(",")
						this.newValues = []
						values.forEach(_value => { if (value.trim()) this.newValues.push(this.normalizeValue(_value.trim())) })
					});
				text.inputEl.rows = 2;
				text.inputEl.cols = 25;
			})
		this.settingEl.addClass("vstacked");
		this.settingEl.addClass("no-border");
		this.controlEl.addClass("full-width");
		this.infoEl.addClass("with-button")
		const infoTextContainer = this.infoEl.createDiv({ cls: "setting-item-info-text" })
		while (infoTextContainer.previousElementSibling) {
			infoTextContainer.prepend(this.infoEl.removeChild(infoTextContainer.previousElementSibling))
		}
		this.infoEl.createDiv({ cls: "spacer" })
		this.infoEl.appendChild(saveButton.buttonEl)
	}
}

class ButtonDisplaySetting extends Setting {
	constructor(
		public plugin: MetadataMenu,
		private containerEl: HTMLElement,
		private name: string,
		private description: string,
		private value:
			"enableLinks" |
			"enableEditor" |
			"enableTabHeader" |
			"enableBacklinks" |
			"enableSearch" |
			"enableFileExplorer" |
			"enableStarred",
		private needsReload: boolean
	) {
		super(containerEl)
		const reloadInfo = this.containerEl.createDiv({ cls: "settings-info-warning" })
		this
			.setName(this.name)
			.setDesc(this.description)
			.addToggle(cb => {
				cb.setValue(this.plugin.settings[this.value]);
				cb.onChange(value => {
					this.plugin.settings[this.value] = value;
					this.plugin.saveSettings();
					if (this.needsReload) reloadInfo.textContent = "Please reload metadata menu to apply this change"
				})
			}).settingEl.addClass("no-border");

	}
}


export default class MetadataMenuSettingTab extends PluginSettingTab {
	private plugin: MetadataMenu;
	private newFileClassesPath: string | null;
	private newFileClassAlias: string
	private newTableViewMaxRecords: number
	private newIcon: string

	constructor(plugin: MetadataMenu) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		this.newFileClassAlias = this.plugin.settings.fileClassAlias
		this.newFileClassesPath = this.plugin.settings.classFilesPath
		this.newTableViewMaxRecords = this.plugin.settings.tableViewMaxRecords
		this.newIcon = this.plugin.settings.fileClassIcon
		this.containerEl.addClass("metadata-menu")
		this.containerEl.addClass("settings")
	};

	private createSettingGroup(title: string, subTitle?: string, withButton: boolean = false): HTMLDivElement {
		const settingHeader = this.containerEl.createEl('div')
		const settingHeaderContainer = settingHeader.createEl("div", { cls: "header-container" });
		const settingHeaderTextContainer = settingHeaderContainer.createEl("div", { cls: "text-container" });
		settingHeaderTextContainer.createEl('h4', { text: title, cls: "section-header" });
		if (subTitle) settingHeaderTextContainer.createEl('div', { text: subTitle, cls: "setting-item-description" });

		const settingsContainer = this.containerEl.createEl("div");
		if (withButton) {
			const settingsContainerShowButtonContainer = settingHeaderContainer.createEl("div", { cls: "setting-item-control" });
			const settingsContainerShowButton = new ButtonComponent(settingsContainerShowButtonContainer);
			settingsContainerShowButton.buttonEl.addClass("setting-item-control");
			settingsContainer.hide();
			settingsContainerShowButton.setCta();
			settingsContainerShowButton.setIcon("chevrons-up-down");

			const toggleState = () => {
				if (settingsContainer.isShown()) {
					settingsContainer.hide();
					settingsContainerShowButton.setIcon("chevrons-up-down");
					settingsContainerShowButton.setCta();
				} else {
					settingsContainer.show();
					settingsContainerShowButton.setIcon("chevrons-down-up");
					settingsContainerShowButton.removeCta();
				}
			}
			settingsContainerShowButton.onClick(() => toggleState());
		}


		return settingsContainer
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();

		/* 
		-----------------------------------------
		Global Settings 
		-----------------------------------------
		*/
		const globalSettings = this.createSettingGroup(
			'Global settings',
			"Global settings to apply to your whole vault",
			true
		)

		/* Scope*/
		const scopeReloadInfo = globalSettings.createDiv({ cls: "settings-info-warning" })
		new Setting(globalSettings)
			.setName('Scope')
			.setDesc('Index fields in frontmatter only or in the whole note (if you use dataview inline fields). ' +
				'Indexing full notes could cause some latencies in vaults with large files')
			.addDropdown((cb: DropdownComponent) => {
				cb.addOption("frontmatterOnly", "Frontmatter only")
				cb.addOption("fullNote", "Full note")
				cb.setValue(this.plugin.settings.frontmatterOnly ? "frontmatterOnly" : "fullNote")
				cb.onChange(async (value) => {
					this.plugin.settings.frontmatterOnly = value === "frontmatterOnly" ? true : false
					await this.plugin.saveSettings();
					scopeReloadInfo.textContent = "Please reload metadata menu to apply this change"
				});
			}).settingEl.addClass("no-border");

		/* Manage menu options display*/
		new Setting(globalSettings)
			.setName("Display field options in context menu")
			.setDesc("Choose to show or hide fields options in the context menu of a link or a file")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.displayFieldsInContextMenu)
				toggle.onChange(async value => {
					this.plugin.settings.displayFieldsInContextMenu = value
					await this.plugin.saveSettings()
				});
			}).settingEl.addClass("no-border");



		/* Exclude Folders from indexing*/
		new SettingTextWithButtonComponent(
			this.plugin, globalSettings, 'Excluded folders',
			'Folders where preset fields and fileClass options won\'t be applied. ' +
			'Useful for templates or settings folders.', 'Enter/folders/paths/, comma/separated/',
			"fileIndexingExcludedFolders",
			(item) => item.replace(/\/?$/, '/')
		)
		/*
		/* Exclude extensions from indexing*/
		new SettingTextWithButtonComponent(
			this.plugin, globalSettings, 'Excluded extensions',
			'Files with these extensions won\'t be indexed ' +
			'Useful for big files that don\'t contain metadata. Comma separated', "",
			"fileIndexingExcludedExtensions",
			(item) => item
		)

		/* Exclude Folders from indexing*/
		new SettingTextWithButtonComponent(
			this.plugin, globalSettings, 'Excluded file name patterns',
			'files with names matching those regex won\'t be indexed. ' +
			'Useful for very specific usecases. Comma separated ', 'foo*, .md$',
			"fileIndexingExcludedRegex",
			(item) => item
		)

		/* Exclude Fields from indexing*/
		new SettingTextWithButtonComponent(
			this.plugin, globalSettings, 'Globally ignored fields',
			'Fields to be ignored by the plugin. Comma separated ', '',
			"globallyIgnoredFields",
			(item) => item
		)

		/* Autocomplete*/
		const enableAutoComplete = new Setting(globalSettings)
			.setName('Autocomplete')
			.setDesc('Activate autocomplete fields')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.isAutosuggestEnabled);
				cb.onChange(value => {
					this.plugin.settings.isAutosuggestEnabled = value;
					this.plugin.saveSettings();
				})
			})
		enableAutoComplete.settingEl.addClass("no-border");
		enableAutoComplete.controlEl.addClass("full-width");

		/* Auto calculated lookups and formulas*/
		const enableAutoCalculation = new Setting(globalSettings)
			.setName('Auto calculation')
			.setDesc('Activate lookups and formulas fields global auto-calculation')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.isAutoCalculationEnabled);
				cb.onChange(value => {
					this.plugin.settings.isAutoCalculationEnabled = value;
					this.plugin.saveSettings();
				})
			})
		enableAutoCalculation.settingEl.addClass("no-border");
		enableAutoCalculation.controlEl.addClass("full-width");



		/* Indexing Status icon*/

		const showIndexingStatus = new Setting(globalSettings)
			.setName('Fields Indexing Status')
			.setDesc('Show fields indexing status icon in status toolbar')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.showIndexingStatusInStatusBar);
				cb.onChange(value => {
					this.plugin.settings.showIndexingStatusInStatusBar = value;
					if (!value) {
						this.plugin.indexStatus.unload()
					} else {
						this.plugin.indexStatus.load()
					}
					this.plugin.saveSettings();
				})
			})
		showIndexingStatus.settingEl.addClass("no-border");
		showIndexingStatus.controlEl.addClass("full-width");


		/* lists display in frontmatter*/
		const frontmatterListDisplay = new Setting(globalSettings)
			.setName('Frontmatter list display')
			.setDesc('Choose wether lists should be displayed as arrays or indented lists in frontmatter')
			.addDropdown((cb: DropdownComponent) => {
				[["Array", "asArray"], ["Indented List", "asList"]].forEach(([display, value]: [string, MultiDisplayType]) => {
					cb.addOption(value, display)
				})
				cb.setValue(this.plugin.settings.frontmatterListDisplay || MultiDisplayType.asArray)
				cb.onChange(async (value: MultiDisplayType) => {
					this.plugin.settings.frontmatterListDisplay = value;
					await this.plugin.saveSettings();
				});
			});
		frontmatterListDisplay.settingEl.addClass("no-border");
		frontmatterListDisplay.controlEl.addClass("full-width");

		/* First day of week (for Date Fields*/
		new Setting(globalSettings)
			.setName('First day of week')
			.setDesc('For date fields, which day the date picker\'s week should start with')
			.addDropdown((cb: DropdownComponent) => {
				for (let i = 0; i < 2; i++) {
					cb.addOption(i.toString(), moment().day(i).format("dddd"))
				}
				cb.setValue(this.plugin.settings.firstDayOfWeek.toString() || "1")
				cb.onChange(async (value) => {
					this.plugin.settings.firstDayOfWeek = parseInt(value);
					await this.plugin.saveSettings();
				});
			}).settingEl.addClass("no-border");

		/* 
		-----------------------------------------
		Managing predefined fields 
		-----------------------------------------
		*/
		/* Add new property for which we want to preset options*/
		containerEl.createDiv({ cls: "setting-divider" })
		const presetFieldsSettings = this.createSettingGroup(
			'Preset Fields settings',
			"Manage globally predefined type and options for a field throughout your whole vault",
			true
		)
		new Setting(presetFieldsSettings)
			.setName("Add New Field Setting")
			.setDesc("Add a new Frontmatter property for which you want preset options.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New Property Manager")
					.setButtonText("Add new")
					.setCta()
					.onClick(async () => {
						//let modal = new FieldSettingsModal(this.plugin, presetFieldsSettings);
						//modal.open();
						openSettings("", undefined, this.plugin, undefined, fieldsContainer)
					});
			}).settingEl.addClass("no-border");
		const fieldsContainer = presetFieldsSettings.createDiv({ cls: "fields-container" })
		/* Managed properties that currently have preset options */
		this.plugin.presetFields.sort((a, b) => {
			const _a = a.path ? a.path + "_" : a.id
			const _b = b.path ? b.path + "_" : b.id
			return _a < _b ? -1 : 1
		}).forEach(prop => {
			const property = new (buildEmptyField(this.plugin, undefined));
			Object.assign(property, prop);
			new FieldSetting(fieldsContainer, property, this.plugin);
		});

		/* 
		-----------------------------------------
		Managing fileClass 
		-----------------------------------------
		*/

		/* Set classFiles Path*/
		containerEl.createDiv({ cls: "setting-divider" });
		const classFilesSettings = this.createSettingGroup(
			'FileClass settings',
			"Manage fileClass folder and alias. " +
			"When a note has a fileClass defined, fileClass field properties will override " +
			"global preset fields settings for the same field name",
			true
		)

		const fileClassesFolderSaveButton = new ButtonComponent(classFilesSettings)
		fileClassesFolderSaveButton.buttonEl.addClass("save")
		fileClassesFolderSaveButton.setIcon("save")
		fileClassesFolderSaveButton.onClick(async () => {
			this.plugin.settings.classFilesPath = this.newFileClassesPath
			await this.plugin.saveSettings()
			fileClassesFolderSaveButton.removeCta()
		})
		const path = new Setting(classFilesSettings)
			.setName('Class Files path')
			.setDesc('Path to the files containing the authorized fields for a type of note')
			.addSearch((cfs) => {
				new FolderSuggest(this.plugin, cfs.inputEl);
				cfs.setPlaceholder("Folder")
					.setValue(this.plugin.settings.classFilesPath || "")
					.onChange((new_folder) => {
						const newPath = new_folder.endsWith("/") || !new_folder ? new_folder : new_folder + "/";
						this.newFileClassesPath = newPath || null
						fileClassesFolderSaveButton.setCta()
					})
			});
		path.settingEl.addClass("no-border");
		path.settingEl.addClass("narrow-title");
		path.controlEl.addClass("full-width");
		path.settingEl.appendChild(fileClassesFolderSaveButton.buttonEl)

		const aliasSaveButton = new ButtonComponent(classFilesSettings)
		aliasSaveButton.buttonEl.addClass("save")
		aliasSaveButton.setIcon("save")
		aliasSaveButton.onClick(async () => {
			this.plugin.settings.fileClassAlias = this.newFileClassAlias
			await this.plugin.saveSettings()
			aliasSaveButton.removeCta()
		})

		const alias = new Setting(classFilesSettings)
			.setName('FileClass field alias')
			.setDesc('Choose another name for fileClass field in frontmatter (example: Category, type, ...')
			.addText((text) => {
				text
					.setValue(this.plugin.settings.fileClassAlias)
					.onChange(async (value) => {
						this.newFileClassAlias = value || "fileClass";
						aliasSaveButton.setCta()
					});
			})
		alias.settingEl.addClass("no-border");
		alias.settingEl.addClass("narrow-title");
		alias.controlEl.addClass("full-width");
		alias.settingEl.appendChild(aliasSaveButton.buttonEl)

		/* 

		/* Set global fileClass*/
		const global = new Setting(classFilesSettings)
			.setName('Global fileClass')
			.setDesc('Choose one fileClass to be applicable to all files ' +
				'(even it is not present as a fileClass attribute in their frontmatter). ' +
				'This will override the preset Fields defined above')
			.addSearch((cfs) => {
				new FileSuggest(
					cfs.inputEl,
					this.plugin,
					this.plugin.settings.classFilesPath || ""
				);
				cfs.setPlaceholder("Global fileClass")
				cfs.setValue(
					this.plugin.settings.globalFileClass ?
						this.plugin.settings.classFilesPath + this.plugin.settings.globalFileClass + ".md" :
						""
				)
					.onChange((newPath) => {
						this.plugin.settings.globalFileClass = newPath ?
							newPath.split('\\').pop()!.split('/').pop()?.replace(".md", "") :
							"";
						this.plugin.saveSettings();
					});
			})
		global.settingEl.addClass("no-border");
		global.settingEl.addClass("narrow-title");
		global.controlEl.addClass("full-width");

		/* Default Icon */
		const defaultIconSave = new ButtonComponent(classFilesSettings)
		defaultIconSave.buttonEl.addClass("save")
		defaultIconSave.setIcon("save")
		defaultIconSave.onClick(async () => {
			this.plugin.settings.fileClassIcon = this.newIcon
			await this.plugin.saveSettings()
			defaultIconSave.removeCta()
		})
		const iconManagerContainer = classFilesSettings.createDiv({ cls: "icon" })
		const defaultIconSetting = new Setting(classFilesSettings)
			.setName("Default Icon")
			.setDesc("Choose a default icon for fileclasses from lucide.dev library")
			.addText(cb => {
				cb.setValue(this.plugin.settings.fileClassIcon || DEFAULT_SETTINGS.fileClassIcon)
					.onChange((value) => {
						this.newIcon = value
						setIcon(iconManagerContainer, value);
						defaultIconSave.setCta()
					})
			})
		setIcon(iconManagerContainer, this.plugin.settings.fileClassIcon || DEFAULT_SETTINGS.fileClassIcon);
		defaultIconSetting.settingEl.appendChild(iconManagerContainer)
		defaultIconSetting.settingEl.appendChild(defaultIconSave.buttonEl)


		defaultIconSetting.settingEl.addClass("no-border");
		defaultIconSetting.settingEl.addClass("narrow-title");
		defaultIconSetting.controlEl.addClass("full-width");

		/* Rows per pages */
		const rowPerPageSaveButton = new ButtonComponent(classFilesSettings)
		rowPerPageSaveButton.buttonEl.addClass("save")
		rowPerPageSaveButton.setIcon("save")
		rowPerPageSaveButton.onClick(async () => {
			this.plugin.settings.tableViewMaxRecords = this.newTableViewMaxRecords
			await this.plugin.saveSettings()
			rowPerPageSaveButton.removeCta()
		})

		const maxRows = new Setting(classFilesSettings)
			.setName('Result per page')
			.setDesc('Number of result per page in table view')
			.addText((text) => {
				text
					.setValue(`${this.plugin.settings.tableViewMaxRecords}`)
					.onChange(async (value) => {
						this.newTableViewMaxRecords = parseInt(value || `${this.plugin.settings.tableViewMaxRecords}`);
						rowPerPageSaveButton.setCta()
					});
			})
		maxRows.settingEl.addClass("no-border");
		maxRows.settingEl.addClass("narrow-title");
		maxRows.controlEl.addClass("full-width");
		maxRows.settingEl.appendChild(rowPerPageSaveButton.buttonEl)

		/* Choose fileclass at file creation Fileclass selector in modal*/

		const chooseFileClassAtFileCreation = new Setting(classFilesSettings)
			.setName('Add a fileclass after create')
			.setDesc('Select a fileclass at file creation to be added to the file')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.chooseFileClassAtFileCreation);
				cb.onChange(value => {
					this.plugin.settings.chooseFileClassAtFileCreation = value;
					this.plugin.saveSettings();
				})
			})
		chooseFileClassAtFileCreation.settingEl.addClass("no-border");
		chooseFileClassAtFileCreation.controlEl.addClass("full-width");


		/* Choose fileclass at file creation Fileclass selector in modal*/

		const autoInsertFieldsAtFileClassInsertion = new Setting(classFilesSettings)
			.setName('Insert fileClass fields')
			.setDesc('Includes fileClass in frontmatter after fileClass choice')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.autoInsertFieldsAtFileClassInsertion);
				cb.onChange(value => {
					this.plugin.settings.autoInsertFieldsAtFileClassInsertion = value;
					this.plugin.saveSettings();
				})
			})
		autoInsertFieldsAtFileClassInsertion.settingEl.addClass("no-border");
		autoInsertFieldsAtFileClassInsertion.controlEl.addClass("full-width");

		/* Fileclass selector in modal*/

		const showFileClassSelectInModal = new Setting(classFilesSettings)
			.setName('Fileclass Select')
			.setDesc('Show fileclass select option in note fields modals')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.showFileClassSelectInModal);
				cb.onChange(value => {
					this.plugin.settings.showFileClassSelectInModal = value;
					this.plugin.saveSettings();
				})
			})
		showFileClassSelectInModal.settingEl.addClass("no-border");
		showFileClassSelectInModal.controlEl.addClass("full-width");

		/* 
		--------------------------------------------------
		Managing extra button display options
		--------------------------------------------------
		*/
		containerEl.createDiv({ cls: "setting-divider" });
		const metadataMenuBtnSettings = this.createSettingGroup(
			'Metadata Menu button',
			'Show extra button to access metadata menu modal of fields',
			true);


		([
			{
				name: "Reading mode links",
				description: "Display an extra button to access metadata menu form after a link in reading mode",
				value: "enableLinks"
			},
			{
				name: "Live preview mode",
				description: "Display an extra button to access metadata menu form after a link in live preview",
				value: "enableEditor"
			},
			{
				name: "Tab header",
				description: "Display an extra button to access metadata menu form in the tab header",
				value: "enableTabHeader"
			},
			{
				name: "Backlinks",
				description: "Display an extra button to access metadata menu form in the backlinks panel",
				value: "enableBacklinks"
			},
			{
				name: "Search",
				description: "Display an extra button to access metadata menu form in the search panel",
				value: "enableSearch"
			},
			{
				name: "File explorer",
				description: "Display an extra button to access metadata menu form in the file explorer",
				value: "enableFileExplorer",
				needsReload: true
			},
			{
				name: "Properties",
				description: "Display fields buttons to access metadata forms in the property section",
				value: "enableProperties"
			},

		] as {
			name: string,
			description: string,
			value:
			"enableLinks" |
			"enableEditor" |
			"enableTabHeader" |
			"enableBacklinks" |
			"enableSearch" |
			"enableFileExplorer" |
			"enableStarred",
			needsReload: boolean
		}[]).forEach(s => new ButtonDisplaySetting(this.plugin, metadataMenuBtnSettings, s.name, s.description, s.value, s.needsReload))

		/* 
		--------------------------------------------------
		Managing predefined fileClass for query's matching files 
		--------------------------------------------------
		*/
		/* Add new query for which matching files will be applied the fileClass*/

		containerEl.createDiv({ cls: "setting-divider" });
		const queryFileClassSettings = this.createSettingGroup(
			'Query based FileClass settings',
			"Manage globally predefined type and options for a field matching this query",
			true
		)
		new Setting(queryFileClassSettings)
			.setName("Add New Query for fileClass")
			.setDesc("Add a new query and a FileClass that will apply to files matching this query.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New fileClass query")
					.setButtonText("Add new")
					.setCta()
					.onClick(async () => {
						let modal = new FileClassQuerySettingsModal(this.plugin, queryFileClassSettings);
						modal.open();
					});
			}).settingEl.addClass("no-border");

		/* Managed properties that currently have preset options */
		this.plugin.initialFileClassQueries
			.forEach(query => {
				const fileClassQuery = new FileClassQuery();
				Object.assign(fileClassQuery, query);
				new FileClassQuerySetting(queryFileClassSettings, fileClassQuery, this.plugin);
			});
	};
};
