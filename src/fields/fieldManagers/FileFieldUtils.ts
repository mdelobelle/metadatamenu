import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import { Link } from "src/types/dataviewTypes";
import Field from "../Field";


const convertDataviewArrayOfLinkToArrayOfPath = (arr: (Link | any)[]) => {
	return arr.reduce((acc, cur) => {
		if (!cur || !cur.path) return acc
		return [...acc, cur.path]
	}, [])
}

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
			let results = getResults(dataview.api);
			if (!results) return []

			if (Array.isArray(results.values)) {
				// .values in this context is not the function of the Array prototype
				// but the property of the DataArrayImpl proxy target returned by a dataview function
				results = results.values
			}
			const filesPath = results.reduce((a: any[], v?: any) => {
				if (!v) return a

				// v is a Link
				if (v.path) return [...a, v.path]

				// v is a TFile
				if (v.file) return [...a, v.file.path]

				if (Array.isArray(v)) return [...a, ...convertDataviewArrayOfLinkToArrayOfPath(v)]

				return a
			}, [])
			return plugin.app.vault.getMarkdownFiles().filter(f => filesPath.includes(f.path));
		} catch (error) {
			throw (error);
		}
	} else {
		return plugin.app.vault.getMarkdownFiles();
	}
}
