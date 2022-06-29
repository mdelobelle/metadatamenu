import { TFile } from "obsidian"
import MetadataMenu from "main"
import OptionsList from "src/options/OptionsList"
import FileClassAttributeSelectModal from "src/fileClass/FileClassAttributeSelectModal"

class linkContextMenu {
	plugin: MetadataMenu
	file: TFile
	optionsList: OptionsList

	constructor(plugin: MetadataMenu) {
		this.plugin = plugin
		this.createContextMenu()
	}

	createContextMenu(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, abstractFile, source) => {
				if (this.plugin.settings.displayFieldsInContextMenu && (
					source === "link-context-menu" ||
					source === "calendar-context-menu" ||
					source === 'pane-more-options' ||
					source === 'file-explorer-context-menu')) {
					const files = this.plugin.app.vault.getMarkdownFiles().filter(mdFile => mdFile.path == abstractFile.path)
					if (files.length > 0) {
						const file = files[0]
						this.file = file
						if (file.parent.path + "/" == this.plugin.settings.classFilesPath) {
							menu.addSeparator()
							menu.addItem((item) => {
								item.setIcon("gear")
								item.setTitle(`Manage <${file.basename}> fields`)
								item.onClick((evt) => {
									const fileClassAttributeSelectModal = new FileClassAttributeSelectModal(this.plugin, file)
									fileClassAttributeSelectModal.open()
								})
							})
						} else {
							this.optionsList = new OptionsList(this.plugin, this.file, menu)
							this.optionsList.createExtraOptionList()
						}
					}
				}
			})
		);
	}
}

export default linkContextMenu