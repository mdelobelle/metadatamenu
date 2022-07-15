import { TFile } from "obsidian";
import MetadataMenu from "main";
import OptionsList from "src/options/OptionsList";
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal";

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
				if (this.plugin.settings.displayFieldsInContextMenu && (
					source === "link-context-menu" ||
					source === "calendar-context-menu" ||
					source === 'pane-more-options' ||
					source === 'file-explorer-context-menu')) {
					const file = this.plugin.app.vault.getAbstractFileByPath(abstractFile.path)
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
				};
			})
		);
	};
};