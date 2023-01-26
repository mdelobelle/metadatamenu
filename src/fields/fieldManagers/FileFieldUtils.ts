import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import Field from "../Field";


export const getFiles = (plugin: MetadataMenu, field: Field, dvQueryString: string, currentFile?: TFile): TFile[] => {
	//@ts-ignore
	const getResults = (api: DataviewPlugin["api"]) => {
		try {
			return (new Function("dv", "current", `return ${dvQueryString}`))(api, api.page(currentFile?.path))
		} catch (error) {
			new Notice(`Wrong query for field <${field.name}>\ncheck your settings`, 3000)
		}
	};
	const dataview = plugin.app.plugins.plugins["dataview"]
	//@ts-ignore
	if (dvQueryString && dataview?.settings.enableDataviewJs && dataview?.settings.enableInlineDataviewJs) {
		try {
			const results = getResults(dataview.api);
			let filesPath: any[] = []
			if (typeof results.values === "function") {
				filesPath = results.reduce((a: any[], v?: any) => (v && v.path) ? [...a, v.path] : a, [])
			} else {
				filesPath = results.values.map((v?: any) => {
					if (!v) return null
					if (v.file) return v.file.path
					return v.path
				})
			}
			return plugin.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
		} catch (error) {
			throw (error);
		}
	} else {
		return plugin.app.vault.getMarkdownFiles();
	}
}
