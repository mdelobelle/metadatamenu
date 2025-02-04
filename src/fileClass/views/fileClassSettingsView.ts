import MetadataMenu from "main";
import { ButtonComponent, FrontMatterCache, MarkdownRenderer, setIcon, TextComponent, ToggleComponent } from "obsidian";
import { FileClass, FileClassOptions } from "../fileClass";
import { BookmarksGroupSuggestModal, FieldSuggestModal, ParentMultiSelectModal, PathSuggestModal, TagSuggestModal } from "./settingsViewComponents/suggestModals";
import { FileClassView, openTab } from "./fileClassView";
import { setTimeout } from "timers/promises";
import { testFileClassFieldsView } from "./fileClassFieldsView";
import { PartialRecord } from "src/typings/types";

type Bindable =
	| "tagNames"
	| "filesPaths"
	| "bookmarksGroups"

type Choosable =
	| Bindable
	| "extends"
	| "excludes"

class FileClassSetting {
	constructor(
		public container: HTMLElement,
		public label: string,
		public toolTipText: string,
		public buildOptionAndAction: (action: HTMLDivElement) => void,
	) {
		this.buildSetting()
	}

	private buildSetting(): void {

		this.container.createDiv({ text: this.label, cls: "label" })
		const toolTipBtnContainer = this.container.createDiv({ cls: "tooltip-btn" });
		const tooltipBtn = new ButtonComponent(toolTipBtnContainer)
			.setIcon("help-circle")
			.setClass("tooltip-button")
		const action = this.container.createDiv({ cls: "action" })
		this.buildOptionAndAction(action);
		const tooltip = this.container.createDiv({ cls: "tooltip-text" });
		tooltip.innerHTML = this.toolTipText
		tooltip.hide();
		tooltipBtn.buttonEl.onmouseover = () => tooltip.show();
		tooltipBtn.buttonEl.onmouseout = () => tooltip.hide();
	}
}

export class FileClassSettingsView {
	public plugin: MetadataMenu;
	public container: HTMLDivElement
	public fileClassOptions: FileClassOptions
	public saveBtn: HTMLButtonElement
	public fileClassSettings: PartialRecord<keyof FileClassOptions, FileClassSetting> = {}

	constructor(
		plugin: MetadataMenu,
		private viewContainer: HTMLDivElement,
		public fileClass: FileClass
	) {
		this.plugin = plugin;
		this.container = this.viewContainer.createDiv({ cls: "fv-settings" })
		this.buildSettings();
	}

	public buildSettings(): void {
		this.fileClassOptions = this.fileClass.getFileClassOptions()
		this.container.replaceChildren();
		const settingsContainer = this.container.createDiv({ cls: "settings-container" })
		this.fileClassSettings["limit"] = new FileClassSetting(
			settingsContainer,
			"Max records per page",
			"Maximum lines displayed per page in the table view",
			(action: HTMLDivElement) => this.buildLimitComponent(action)
		);
		this.fileClassSettings["mapWithTag"] = new FileClassSetting(
			settingsContainer,
			"Map with tag",
			`Bind tags with ${this.plugin.settings.fileClassAlias}<br/>` +
			`If Tag Names are empty this fileClass will be bound with the tag of same name`,
			(action: HTMLDivElement) => this.buildMapWithTagComponent(action)
		)
		this.fileClassSettings["icon"] = new FileClassSetting(
			settingsContainer,
			"Button Icon",
			"Name of the icon for the metadata menu button<br/>(lucide.dev)",
			(action: HTMLDivElement) => this.buildIconComponent(action)
		)
		this.fileClassSettings["tagNames"] = new FileClassSetting(
			settingsContainer,
			"Tag Names",
			`Names of tags to bind this ${this.plugin.settings.fileClassAlias} with`,
			(action: HTMLDivElement) => this.buildBindingComponent(action, "tagNames", TagSuggestModal)
		)
		this.fileClassSettings["filesPaths"] = new FileClassSetting(
			settingsContainer,
			"Files paths",
			`Paths of files to bind this ${this.plugin.settings.fileClassAlias} with`,
			(action: HTMLDivElement) => this.buildBindingComponent(action, "filesPaths", PathSuggestModal)
		)
		this.fileClassSettings["bookmarksGroups"] = new FileClassSetting(
			settingsContainer,
			"Bookmarks groups",
			`Names group of bookmarked files to bind this ${this.plugin.settings.fileClassAlias} with`,
			(action: HTMLDivElement) => this.buildBindingComponent(action, "bookmarksGroups", BookmarksGroupSuggestModal)
		)
		this.fileClassSettings["parents"] = new FileClassSetting(
			settingsContainer,
			"Parent Fileclasses",
			"Choose a fileClass to inherit fields from",
			(action: HTMLDivElement) => this.buildExtendComponent(action)
		)
		this.fileClassSettings["excludes"] = new FileClassSetting(
			settingsContainer,
			"Excluded Fields",
			`Names of fields to exclude from ancestor fileclasses`,
			(action: HTMLDivElement) => this.buildExcludesComponent(action)
		)
		this.buildSaveBtn();
		this.saveBtn.removeClass("active")
	}

	private buildSaveBtn(): void {
		const footer = this.container.createDiv({ cls: "footer" });
		const btnContainer = footer.createDiv({ cls: "cell" })
		this.saveBtn = btnContainer.createEl('button');
		setIcon(this.saveBtn, "save")
		this.saveBtn.onclick = async () => {
			await this.fileClass.updateOptions(this.fileClassOptions);
			this.saveBtn.removeClass("active")
		}
	}

	private buildLimitComponent(action: HTMLDivElement): void {
		const input = new TextComponent(action)
			.setValue(`${this.fileClassOptions.limit}`)
			.onChange((value) => {
				this.saveBtn.addClass("active");
				this.fileClassOptions.limit = parseInt(value) || this.fileClassOptions.limit;
			})
		input.inputEl.setAttr("id", "fileclass-settings-limit-input")
	}

	private buildMapWithTagComponent(action: HTMLDivElement): void {
		const toggler = new ToggleComponent(action);
		toggler.setValue(this.fileClassOptions.mapWithTag)
		toggler.onChange((value) => {
			this.saveBtn.addClass("active");
			this.fileClassOptions.mapWithTag = value;
		})
		toggler.toggleEl.setAttr("id", "fileclass-settings-mapWithTag-toggler")
	}

	private buildIconComponent(action: HTMLDivElement): void {
		const iconManagerContainer = action.createDiv({ cls: "icon-manager" })
		const input = new TextComponent(iconManagerContainer);
		const iconContainer = iconManagerContainer.createDiv({})
		input.setValue(this.fileClassOptions.icon);
		setIcon(iconContainer, this.fileClassOptions.icon);
		input.onChange((value) => {
			this.saveBtn.addClass("active");
			this.fileClassOptions.icon = value;
			setIcon(iconContainer, this.fileClassOptions.icon);
		})
		input.inputEl.setAttr("id", "fileclass-settings-icon-input")
	}


	private buildBindingComponent(
		action: HTMLDivElement,
		setting: Bindable,
		suggestModal: typeof PathSuggestModal | typeof TagSuggestModal | typeof BookmarksGroupSuggestModal
	): void {
		const itemsContainer = action.createDiv({ cls: "items" })
		const boundItemsNames = this.fileClassOptions[setting]
		boundItemsNames?.forEach(item => {
			const itemContainer = itemsContainer.createDiv({ cls: "item chip", text: item })
			new ButtonComponent(itemContainer)
				.setIcon("x-circle")
				.setClass("item-remove")
				.onClick(async () => {
					boundItemsNames?.remove(item)
					await this.fileClass.updateOptions(this.fileClassOptions);
				})
		})
		const addBtn = itemsContainer.createEl('button', { cls: "item add" })
		addBtn.setAttr("id", `fileclass-setting-${setting}-addBtn`)
		setIcon(addBtn, "plus-circle")
		addBtn.onclick = () => {
			new suggestModal(this).open();
		}
	}

	private buildExcludesComponent(action: HTMLDivElement): void {
		const fieldsContainer = action.createDiv({ cls: "items" })
		this.fileClassOptions.excludes?.forEach(field => {
			const fieldcontainer = fieldsContainer.createDiv({ cls: "item chip", text: field.name })
			new ButtonComponent(fieldcontainer)
				.setIcon("x-circle")
				.setClass("item-remove")
				.onClick(async () => {
					const excludedFields = this.fileClassOptions.excludes?.filter(attr => attr.name !== field.name)
					this.fileClassOptions.excludes = excludedFields
					await this.fileClass.updateOptions(this.fileClassOptions);
				})
		})
		const fieldAddBtn = fieldsContainer.createEl('button', { cls: "item" })
		fieldAddBtn.setAttr('id', `fileclass-setting-excludes-addBtn`)
		setIcon(fieldAddBtn, "plus-circle")
		fieldAddBtn.onclick = () => {
			new FieldSuggestModal(this).open();
		}
	}

	private buildExtendComponent(action: HTMLDivElement): void {
		const parentManagerContainer = action.createDiv({ cls: "items" })
		const parentLinkContainer = parentManagerContainer.createDiv({ cls: "item" })
		const parents = this.fileClassOptions.parents
		if (parents.length > 0) {
			const path = this.fileClass.getClassFile().path
			const component = this.plugin
			MarkdownRenderer.render(this.plugin.app, parents.map(p => `[[${p}]]`).join(', '), parentLinkContainer, path, component)
			parentLinkContainer.querySelector("a.internal-link")?.addEventListener("click", (e) => {
				this.plugin.app.workspace.openLinkText(
					//@ts-ignore
					e.target.getAttr("data-href").split("/").last()?.replace(/(.*).md/, "$1"),
					path,
					//@ts-ignore
					'tab'
				)
			})
		}
		parentManagerContainer.createDiv({ cls: "item spacer" })
		const parentChangeBtn = parentManagerContainer.createEl('button', { cls: "item right-align" })
		parentChangeBtn.setAttr('id', `fileclass-setting-extends-addBtn`)
		setIcon(parentChangeBtn, "edit")
		parentChangeBtn.onclick = () => {
			new ParentMultiSelectModal(this).open();
		}
	}
}

//#region tests

export async function testFileClassSettingsView(plugin: MetadataMenu, fileClass: FileClass, data: FrontMatterCache, speed = 100) {
	const runner = plugin.testRunner
	const fCView = plugin.app.workspace.getActiveViewOfType(FileClassView)
	if (!fCView || !fCView.settingsView) return runner.log("ERROR", `${fileClass.name} view didn't open`)

	const settingsMenuHeader = fCView.containerEl.querySelector("#settingsOption") as HTMLElement
	if (!settingsMenuHeader) return runner.log("ERROR", `${fileClass.name} settings menu not found`)
	settingsMenuHeader.click()
	await setTimeout(speed)

	const container = fCView.settingsView.container
	const selectChoices = async (collection: Choosable) => {
		const items: string[] = Array.isArray(data[collection])
			? data[collection]
			: data[collection] !== null
				? [data[collection]]
				: []
		if (!items.length) return
		const addBtn = container.querySelector(`#fileclass-setting-${collection}-addBtn`)
		if (!addBtn || !(addBtn instanceof HTMLButtonElement)) return runner.log("ERROR", `add ${collection} button not found`)
		for (const item of items) {
			addBtn.click()
			await setTimeout(speed)
			const choices = document.querySelectorAll(`#${fileClass.name}-${collection}-suggest-modal .suggestion-item`)
			for (const choice of choices) {
				if ((choice instanceof HTMLDivElement) && choice.innerText.replace(/^#(.*)/, "$1") === item) {
					choice.click()
					await setTimeout(50) // this choice will trigger an async save
				}
			}
		}
	}

	if ("limit" in data) {
		const input = container.querySelector("#fileclass-settings-limit-input") as HTMLInputElement
		if (!input) throw Error("Limit input not found")
		input.value = data.limit
		input.dispatchEvent(new Event("input"))
	}
	if ("mapWithTag" in data && data.mapWithTag) {
		const toggle = container.querySelector("#fileclass-settings-mapWithTag-toggler") as HTMLElement
		if (!toggle) throw Error("Map with tag toggler not found")
		toggle.click()
	}
	if ("icon" in data) {
		const input = container.querySelector("#fileclass-settings-icon-input") as HTMLInputElement
		if (!input) throw Error("Icon input not found")
		input.value = data.icon
		input.dispatchEvent(new Event("input"))
	}
	fCView.settingsView.saveBtn.click()
	await setTimeout(50) //upper changes have to be saved before changing other settings
	await selectChoices("tagNames")
	await selectChoices("bookmarksGroups")
	await selectChoices("filesPaths")
	await selectChoices("extends")
	await testFileClassFieldsView(plugin, fCView.fileClass, data, speed)
	await selectChoices("excludes")
}

//#endregion
