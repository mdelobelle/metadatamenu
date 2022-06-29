import { App, PluginSettingTab, Setting, ButtonComponent, ToggleComponent } from "obsidian"
import MetadataMenu from "main"
import FieldSettingsModal from "src/settings/FieldSettingsModal"
import Field from "src/Field"
import FieldSetting from "src/settings/FieldSetting"

export default class MetadataMenuSettingTab extends PluginSettingTab {
	plugin: MetadataMenu;
	debouncedGenerate: Function;

	constructor(app: App, plugin: MetadataMenu) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h4', { text: 'Settings' });

		// Managing choice wether you get attributes from inline fields and frontmatter or only frontmater
		new Setting(containerEl)
			.setName('Search for attribute in Inline fields like <field::>')
			.setDesc('Sets the `data-link-<field>`-attribute to the value of inline fields')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.getFromInlineField)
				toggle.onChange(async value => {
					this.plugin.settings.getFromInlineField = value
					await this.plugin.saveSettings()
				});
			});

		/* Managing predefined values for properties */
		/* Manage menu options display*/
		new Setting(containerEl)
			.setName("Display field options in context menu")
			.setDesc("Choose to show or hide fields options in the context menu of a link or a file")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.displayFieldsInContextMenu)
				toggle.onChange(async value => {
					this.plugin.settings.displayFieldsInContextMenu = value
					await this.plugin.saveSettings()
				})
			})
		/* Exclude Fields from context menu*/
		new Setting(containerEl)
			.setName('Ignored fields')
			.setDesc('Fields to be ignored by the plugin when adding options to the context menu')
			.addTextArea((text) => {
				text
					.setPlaceholder('Enter fields as string, comma separated')
					.setValue(this.plugin.settings.globallyIgnoredFields.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.globallyIgnoredFields = value.replace(/\s/g, '').split(',');
						await this.plugin.saveSettings();
					})
				text.inputEl.rows = 6;
				text.inputEl.cols = 25;
			});

		/* Set classFiles Path*/
		new Setting(containerEl)
			.setName('class Files path')
			.setDesc('Path to the files containing the authorized fields for a type of note')
			.addText((text) => {
				text
					.setPlaceholder('Path/')
					.setValue(this.plugin.settings.classFilesPath)
					.onChange(async (value) => {
						this.plugin.settings.classFilesPath = value
						await this.plugin.saveSettings();
					})
			});

		/* Add new property for which we want to preset values*/
		new Setting(containerEl)
			.setName("Add New Property Manager")
			.setDesc("Add a new Frontmatter property for which you want preset values.")
			.addButton((button: ButtonComponent): ButtonComponent => {
				return button
					.setTooltip("Add New Property Manager")
					.setButtonText("+")
					.onClick(async () => {
						let modal = new FieldSettingsModal(this.app, this.plugin, containerEl);
						modal.open();
					});
			});

		/* Managed properties that currently have preset values */
		this.plugin.initialProperties.forEach(prop => {
			const property = new Field()
			Object.assign(property, prop)
			new FieldSetting(containerEl, property, this.app, this.plugin)
		})
	}
}
