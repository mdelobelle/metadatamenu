import { PluginSettingTab, Setting, ButtonComponent, ToggleComponent, Modal, DropdownComponent, moment, setIcon } from "obsidian";
import MetadataMenu from "main";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import Field from "src/fields/Field";
import FieldSetting from "src/settings/FieldSetting";
import { FolderSuggest } from "src/suggester/FolderSuggester";
import { FileSuggest } from "src/suggester/FileSuggester";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FileClassQuerySettingsModal from "./FileClassQuerySettingModal";
import FileClassQuerySetting from "./FileClassQuerySetting";
import { MultiDisplayType } from "src/types/fieldTypes";

export default class MetadataMenuSettingTab extends PluginSettingTab {
	private plugin: MetadataMenu;
	private newFileClassesPath: string | null;
	private newFileClassAlias: string
	constructor(plugin: MetadataMenu) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		this.newFileClassAlias = this.plugin.settings.fileClassAlias
		this.newFileClassesPath = this.plugin.settings.classFilesPath
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
		const excludedFolders = new Setting(globalSettings)
			.setName('Excluded folders')
			.setDesc('Folders where preset fields and fileClass options won\'t be applied. ' +
				'Useful for templates folders ' +
				'or to speedup indexing when you exclude large md files such as excalidraw files')
			.addTextArea((text) => {
				text
					.setPlaceholder('Enter/folders/paths/, comma/separated/')
					.setValue(this.plugin.settings.fileClassExcludedFolders.join(', '))
					.onChange(async (value) => {
						const values = value.split(",")
						const paths: Array<string> = []
						values.forEach(path => { if (path.trim()) paths.push(path.trim().replace(/\/?$/, '/')) })
						this.plugin.settings.fileClassExcludedFolders = paths;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.cols = 25;
			})
		excludedFolders.settingEl.addClass("vstacked");
		excludedFolders.settingEl.addClass("no-border");
		excludedFolders.controlEl.addClass("full-width");


		/* Exclude Fields from context menu*/
		const globallyIgnoredFieldsSetting = new Setting(globalSettings)
			.setName('Globally ignored fields')
			.setDesc('Fields to be ignored by the plugin when adding options to the context menu')
			.addTextArea((text) => {
				text
					.setPlaceholder('Enter fields as string, comma separated')
					.setValue(this.plugin.settings.globallyIgnoredFields.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.globallyIgnoredFields = value.split(',').map(item => item.trim());
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.cols = 25;
			})
		globallyIgnoredFieldsSetting.settingEl.addClass("vstacked");
		globallyIgnoredFieldsSetting.settingEl.addClass("no-border");
		globallyIgnoredFieldsSetting.controlEl.addClass("full-width");

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

		/* Indexing Status icon*/
		/*
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
		*/

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
		Managing predefined options for properties 
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
						let modal = new FieldSettingsModal(this.plugin, presetFieldsSettings);
						modal.open();
					});
			}).settingEl.addClass("no-border");
		const fieldsContainer = presetFieldsSettings.createDiv({ cls: "fields-container" })
		/* Managed properties that currently have preset options */
		this.plugin.presetFields.sort((a, b) => (a.path || a.id) < (b.path || b.id) ? -1 : 1).forEach(prop => {
			const property = new Field(this.plugin);
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
			.setName('class Files path')
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
			.setName('fileClass field alias')
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
			.setName('global fileClass')
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

		/* 
		--------------------------------------------------
		Managing extra button display options
		--------------------------------------------------
		*/
		containerEl.createDiv({ cls: "setting-divider" });
		const metadataMenuBtnSettings = this.createSettingGroup(
			'Metadata Menu button',
			'Show extra button to access metadata menu modal of fields',
			true)

		new Setting(metadataMenuBtnSettings)
			.setName("Metadata Menu button icon")
			.setDesc("name of the default icon when not defined in fileClass")
			.addText((text) => {
				text
					.setValue(this.plugin.settings.buttonIcon)
					.onChange(async (value) => {
						this.plugin.settings.buttonIcon = value || "clipboard-list";
						await this.plugin.saveSettings();
					});
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Reading mode links")
			.setDesc("Display an extra button to access metadata menu form after a link in reading mode")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableLinks);
				cb.onChange(value => {
					this.plugin.settings.enableLinks = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Live preview mode")
			.setDesc("Display an extra button to access metadata menu form after a link in live preview")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableEditor);
				cb.onChange(value => {
					this.plugin.settings.enableEditor = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Tab header")
			.setDesc("Display an extra button to access metadata menu form in the tab header")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableTabHeader);
				cb.onChange(value => {
					this.plugin.settings.enableTabHeader = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Backlinks")
			.setDesc("Display an extra button to access metadata menu form in the backlinks panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableBacklinks);
				cb.onChange(value => {
					this.plugin.settings.enableBacklinks = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Search")
			.setDesc("Display an extra button to access metadata menu form in the search panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableSearch);
				cb.onChange(value => {
					this.plugin.settings.enableSearch = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("File explorer")
			.setDesc("Display an extra button to access metadata menu form in the file explorer")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableFileExplorer);
				cb.onChange(value => {
					this.plugin.settings.enableFileExplorer = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

		new Setting(metadataMenuBtnSettings)
			.setName("Starred")
			.setDesc("Display an extra button to access metadata menu form in the starred panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableStarred);
				cb.onChange(value => {
					this.plugin.settings.enableStarred = value;
					this.plugin.saveSettings();
				})
			}).settingEl.addClass("no-border");

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
