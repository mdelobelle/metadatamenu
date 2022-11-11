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

class SettingsMigrationConfirmModal extends Modal {

	constructor(
		private plugin: MetadataMenu,
		private tab: MetadataMenuSettingTab
	) {
		super(plugin.app);
	};

	onOpen(): void {

		this.titleEl.setText("Confirm");
		const body = this.contentEl.createDiv({
			cls: "modal-text-danger"
		});
		body.setText("This will erase current settings. Are you sure?");
		const confirmButton = new ButtonComponent(this.contentEl);
		confirmButton.setIcon("check");
		confirmButton.onClick(() => {
			//@ts-ignore
			if (this.plugin.app.plugins.plugins.hasOwnProperty("supercharged-links-obsidian")) {
				//@ts-ignore
				let settings = this.plugin.app.plugins.plugins["supercharged-links-obsidian"].settings;
				//deep copying presetFields in initialProperty
				this.plugin.initialProperties = [];
				settings.presetFields?.forEach((prop: Field) => {
					const field = new Field();
					Object.assign(field, prop);
					this.plugin.initialProperties.push(field);
				})

				this.plugin.saveSettings();
				this.close();
			};
		});
	};

	onClose(): void {
		this.tab.display();
	};
};



export default class MetadataMenuSettingTab extends PluginSettingTab {
	private plugin: MetadataMenu;

	constructor(plugin: MetadataMenu) {
		super(app, plugin);
		this.plugin = plugin;
	};

	display(): void {
		let { containerEl } = this;
		containerEl.empty();

		/* 
		-----------------------------------------
		Global Settings 
		-----------------------------------------
		*/
		const globalSettings = containerEl.createEl('div')
		globalSettings.createEl('h4', { text: 'Global settings', cls: "metadata-menu-setting-section-header" });
		globalSettings.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Global settings to apply to your whole vault"
		})

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
			});
		/* Exclude Fields from context menu*/
		new Setting(globalSettings)
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
			});


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
			});

		/* 
		-----------------------------------------
		Managing predefined options for properties 
		-----------------------------------------
		*/
		/* Add new property for which we want to preset options*/
		const presetFieldsSettings = containerEl.createEl("div");
		const presetFieldsSettingHeaderContainer = presetFieldsSettings.createEl("div", { cls: "metadata-menu-setting-section-header-container" });
		const presetFieldsSettingHeaderTextContainer = presetFieldsSettingHeaderContainer.createEl("div", { cls: "metadata-menu-setting-section-header-text-container" });
		presetFieldsSettingHeaderTextContainer.createEl('h4', { text: 'Preset Fields settings', cls: "metadata-menu-setting-section-header" });
		presetFieldsSettingHeaderTextContainer.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Manage globally predefined type and options for a field throughout your whole vault"
		});
		const presetFieldsSettingsContainerShowButtonContainer = presetFieldsSettingHeaderContainer.createEl("div", { cls: "setting-item-control" });
		const presetFieldsSettingsContainerShowButton = presetFieldsSettingsContainerShowButtonContainer.createEl("button");
		presetFieldsSettingsContainerShowButton.addClass("setting-item-control");

		const presetFieldsSettingsContainer = presetFieldsSettings.createEl("div");
		new Setting(presetFieldsSettingsContainer)
			.setName("Add New Field Setting")
			.setDesc("Add a new Frontmatter property for which you want preset options.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New Property Manager")
					.setButtonText("+")
					.onClick(async () => {
						let modal = new FieldSettingsModal(this.plugin, presetFieldsSettingsContainer);
						modal.open();
					});
			});

		/* Managed properties that currently have preset options */
		this.plugin.initialProperties.forEach(prop => {
			const property = new Field();
			Object.assign(property, prop);
			new FieldSetting(presetFieldsSettingsContainer, property, this.plugin);
		});

		presetFieldsSettingsContainer.isShown() ?
			setIcon(presetFieldsSettingsContainerShowButton, "double-up-arrow-glyph") :
			setIcon(presetFieldsSettingsContainerShowButton, "double-down-arrow-glyph");
		presetFieldsSettingsContainerShowButton.onclick = () => {
			presetFieldsSettingsContainer.isShown() ?
				presetFieldsSettingsContainer.hide() :
				presetFieldsSettingsContainer.show();
			presetFieldsSettingsContainer.isShown() ?
				setIcon(presetFieldsSettingsContainerShowButton, "double-up-arrow-glyph") :
				setIcon(presetFieldsSettingsContainerShowButton, "double-down-arrow-glyph");
		}

		/* 
		-----------------------------------------
		Managing fileClass 
		-----------------------------------------
		*/

		/* Set classFiles Path*/
		const classFilesSettings = containerEl.createEl("div")
		const classFilesSettingsHeaderContainer = classFilesSettings.createEl("div", { cls: "metadata-menu-setting-section-header-container" });
		const classFilesSettingsHeaderTextContainer = classFilesSettingsHeaderContainer.createEl("div", { cls: "metadata-menu-setting-section-header-text-container" });
		classFilesSettingsHeaderTextContainer.createEl('h4', { text: 'FileClass settings', cls: "metadata-menu-setting-section-header" });
		classFilesSettingsHeaderTextContainer.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Manage fileClass folder and alias. " +
				"When a note has a fileClass defined, fileClass field properties will override global preset fields settings for the same field name"
		});

		const classFilesSettingsContainerShowButtonContainer = classFilesSettingsHeaderContainer.createEl("div", { cls: "setting-item-control" });
		const classFilesSettingsContainerShowButton = classFilesSettingsContainerShowButtonContainer.createEl("button");

		classFilesSettingsContainerShowButton.addClass("setting-item-control");
		const classFilesSettingsContainer = classFilesSettings.createEl("div");

		new Setting(classFilesSettingsContainer)
			.setName('class Files path')
			.setDesc('Path to the files containing the authorized fields for a type of note')
			.addSearch((cfs) => {
				new FolderSuggest(this.plugin, cfs.inputEl);
				cfs.setPlaceholder("Folder")
					.setValue(this.plugin.settings.classFilesPath || "")
					.onChange((new_folder) => {
						const newPath = new_folder.endsWith("/") || !new_folder ? new_folder : new_folder + "/";
						this.plugin.settings.classFilesPath = newPath || null;
						this.plugin.saveSettings();
					});
				// @ts-ignore
				cfs.containerEl.addClass("metadata-menu-setting-fileClass-search")
			});

		new Setting(classFilesSettingsContainer)
			.setName('fileClass field alias')
			.setDesc('Choose another name for fileClass field in frontmatter (example: Category, type, ...')
			.addText((text) => {
				text
					.setValue(this.plugin.settings.fileClassAlias)
					.onChange(async (value) => {
						this.plugin.settings.fileClassAlias = value || "fileClass";
						await this.plugin.saveSettings();
					});
			});

		/* 

		/* Set global fileClass*/
		new Setting(classFilesSettingsContainer)
			.setName('global fileClass')
			.setDesc('Choose one fileClass to be applicable to all files (even it is not present as a fileClass attribute in their frontmatter). This will override the preset Fields defined above')
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
				// @ts-ignore
				cfs.containerEl.addClass("metadata-menu-setting-fileClass-search")
			})

		/* 
		--------------------------------------------------
		Managing extra button display options
		--------------------------------------------------
		*/
		const metadataMenuBtnSettings = classFilesSettingsContainer.createEl("div")
		metadataMenuBtnSettings.createEl('h4', { text: 'Show extra button to access metadata menu form:', cls: "metadata-menu-setting-section-header" })

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
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Reading mode links")
			.setDesc("Display an extra button to access metadata menu form after a link in reading mode")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableLinks);
				cb.onChange(value => {
					this.plugin.settings.enableLinks = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Live preview mode")
			.setDesc("Display an extra button to access metadata menu form after a link in live preview")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableEditor);
				cb.onChange(value => {
					this.plugin.settings.enableEditor = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Tab header")
			.setDesc("Display an extra button to access metadata menu form in the tab header")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableTabHeader);
				cb.onChange(value => {
					this.plugin.settings.enableTabHeader = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Backlinks")
			.setDesc("Display an extra button to access metadata menu form in the backlinks panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableBacklinks);
				cb.onChange(value => {
					this.plugin.settings.enableBacklinks = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Search")
			.setDesc("Display an extra button to access metadata menu form in the search panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableSearch);
				cb.onChange(value => {
					this.plugin.settings.enableSearch = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("File explorer")
			.setDesc("Display an extra button to access metadata menu form in the file explorer")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableFileExplorer);
				cb.onChange(value => {
					this.plugin.settings.enableFileExplorer = value;
					this.plugin.saveSettings();
				})
			})

		new Setting(metadataMenuBtnSettings)
			.setName("Starred")
			.setDesc("Display an extra button to access metadata menu form in the starred panel")
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableStarred);
				cb.onChange(value => {
					this.plugin.settings.enableStarred = value;
					this.plugin.saveSettings();
				})
			})

		/* 
		--------------------------------------------------
		Managing predefined fileClass for query's matching files 
		--------------------------------------------------
		*/
		/* Add new query for which matching files will be applied the fileClass*/
		const queryFileClassSettings = classFilesSettingsContainer.createEl("div")
		queryFileClassSettings.createEl('h4', { text: 'Query based FileClass settings', cls: "metadata-menu-setting-section-header" });
		queryFileClassSettings.createEl('div', {
			cls: "setting-item-description metadata-menu-setting-section-desc",
			text: "Manage globally predefined type and options for a field matching this query"
		})
		new Setting(queryFileClassSettings)
			.setName("Add New Query for fileClass")
			.setDesc("Add a new query and a FileClass that will apply to files matching this query.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New Property Manager")
					.setButtonText("+")
					.onClick(async () => {
						let modal = new FileClassQuerySettingsModal(this.plugin, queryFileClassSettings);
						modal.open();
					});
			});

		/* Managed properties that currently have preset options */
		this.plugin.initialFileClassQueries
			.forEach(query => {
				const fileClassQuery = new FileClassQuery();
				Object.assign(fileClassQuery, query);
				new FileClassQuerySetting(queryFileClassSettings, fileClassQuery, this.plugin);
			});

		classFilesSettingsContainer.isShown() ?
			setIcon(classFilesSettingsContainerShowButton, "double-up-arrow-glyph") :
			setIcon(classFilesSettingsContainerShowButton, "double-down-arrow-glyph");
		classFilesSettingsContainerShowButton.onclick = () => {
			classFilesSettingsContainer.isShown() ?
				classFilesSettingsContainer.hide() :
				classFilesSettingsContainer.show();
			classFilesSettingsContainer.isShown() ?
				setIcon(classFilesSettingsContainerShowButton, "double-up-arrow-glyph") :
				setIcon(classFilesSettingsContainerShowButton, "double-down-arrow-glyph");
		}

		/* 
		-----------------------------------------
		Migration settings 
		-----------------------------------------
		*/
		const migrateSettings = containerEl.createEl("div")
		migrateSettings.createEl('h4', { text: 'Migrate' });

		/* Add new property for which we want to preset options*/
		new Setting(migrateSettings)
			.setName("Copy settings from supercharged links plugin")
			.setDesc("Copy settings from supercharged links plugin")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Get settings from supercharged links")
					.setButtonText("Copy")
					.onClick(async () => {
						let modal = new SettingsMigrationConfirmModal(this.plugin, this);
						modal.open();
					});
			});
	};
};
