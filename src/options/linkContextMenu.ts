import MetadataMenu from "main";
import { TFile } from "obsidian";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";
import OptionsList from "src/options/OptionsList";
import FieldCommandSuggestModal from "../optionModals/FieldCommandSuggestModal";

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
							item.setIcon("wrench-screwdriver-glyph");
							item.setTitle(`Manage <${file.basename}> fields`);
							item.onClick((evt) => {
								const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, file);
								fileClassAttributeSelectModal.open();
							});
							item.setSection("target-metadata");
						});
					} else {
						//If displayFieldsInContextMenu true, show all fields in note
						if (this.plugin.settings.displayFieldsInContextMenu) {
							this.optionsList = new OptionsList(this.plugin, this.file, menu);
							this.optionsList.createExtraOptionList();
						} else {

							//New Field
							const fieldOptions = new FieldCommandSuggestModal(app);
							this.optionsList = new OptionsList(this.plugin, this.file, fieldOptions);
							this.optionsList.createExtraOptionList(false);

							//Field Options
							menu.addItem((item) => {
								item.setIcon("bullet-list")
								item.setTitle(`Field Options`)
								item.onClick((evt) => { fieldOptions.open(); })
								item.setSection("target-metadata");
							})
						}
					};
				};
			})
		);
	};
};