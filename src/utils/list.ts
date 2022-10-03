import MetadataMenu from "main";
import { ListItemCache, TFile } from "obsidian";

export function getListBounds(plugin: MetadataMenu, file: TFile, parent: number): { start: number, end: number } | undefined {
    const listItems: ListItemCache[] = (plugin.app.metadataCache.getFileCache(file)?.listItems || [])
        .sort((a, b) => a.position.start.line - b.position.start.line);
    const subParentsLines = [-parent - 1];
    let start: number = parent;
    let end: number = -1;
    let outOfList: boolean = false;
    listItems.forEach(listItem => {
        if (subParentsLines.includes(listItem.parent) && !outOfList) {
            subParentsLines.push(listItem.position.start.line);
            if (start > listItem.position.start.line) start = listItem.position.start.line;
            if (end <= listItem.position.end.line) {
                if (listItem.position.end.line == listItem.position.start.line) {
                    end = listItem.position.end.line;
                } else {
                    end = listItem.position.start.line;
                    outOfList = true
                }
            }
        }
    })
    if (end >= 0) {
        return { start: start, end: end }
    }
    return
}