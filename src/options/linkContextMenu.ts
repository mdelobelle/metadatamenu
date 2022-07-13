import { App, TFile } from "obsidian";
import MetadataMenu from "main";
import OptionsList from "src/options/OptionsList";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import NoteFieldsCommandsModal from "src/options/NoteFieldsCommandsModal";

export default class linkContextMenu {
	plugin: MetadataMenu;
	file: TFile;
	optionsList: OptionsList;

	constructor(plugin: MetadataMenu) {
		this.plugin = plugin;
		this.createContextMenu();
	};

	createContextMenu(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, abstractFile, source) => {

				const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path)

				//displayFieldsInContextMenu Toggled on, show all fields
				if (this.plugin.settings.displayFieldsInContextMenu && (
					source === "link-context-menu" ||
					source === "calendar-context-menu" ||
					source === 'pane-more-options' ||
					source === 'file-explorer-context-menu'
				)) {

					if (file instanceof TFile && file.extension === 'md') {
						this.file = file;
					
						if (file.parent.path + "/" == this.plugin.settings.classFilesPath) {
							menu.addSeparator();
							menu.addItem((item) => {
								item.setIcon("gear");
								item.setTitle(`Manage <${file.basename}> fields`);
								item.onClick((evt) => {
									const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, file);
									fileClassAttributeSelectModal.open();
								});
							});
						} else {
							this.optionsList = new OptionsList(this.plugin, this.file, menu);
							this.optionsList.createExtraOptionList();
						};
					};
				
				//Else Show Singular Command Option
				} else {
					//New Field
					if (file instanceof TFile && file.extension === 'md') {
						this.file = file;
						this.optionsList = new OptionsList(this.plugin, this.file, menu);
						this.optionsList.addSectionSelectModalOption();
					}
					//Field Options
					menu.addItem((item) => {
						item.setIcon("bullet-list"),
						item.setTitle(`Field Options`),
						item.onClick((evt) => {
							const fieldOptions = new NoteFieldsCommandsModal(app, this.plugin, file);
								fieldOptions.open();
						})
						item.setSection("target-metadata");
					})
				};
			})
		);
	};
};