import { TFile } from "obsidian";
import MetadataMenu from "main";
import OptionsList from "src/options/OptionsList";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import NoteFieldsCommandsModal from "./NoteFieldsCommandsModal";

export default class linkContextMenu {
	private plugin: MetadataMenu;
	private file: TFile;
	private optionsList: OptionsList;

	constructor(plugin: MetadataMenu) {
		this.plugin = plugin;
		this.createContextMenu();
	};

	private createContextMenu(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, abstractFile, source) => {

				const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path);

				if (file instanceof TFile && file.extension === 'md') {
					this.file = file;

					//If fileClass
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
						//If displayFieldsInContextMenu true, show all fields in note
						if (this.plugin.settings.displayFieldsInContextMenu) {
							this.optionsList = new OptionsList(this.plugin, this.file, menu);
							this.optionsList.createExtraOptionList();
						} else {

							//New Field
							this.optionsList = new OptionsList(this.plugin, this.file, menu);

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
						}
					};
				};
			})
		);
	};
};