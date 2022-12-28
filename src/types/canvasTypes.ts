import { CanvasFileData, CanvasLinkData, CanvasNodeData, CanvasTextData } from "obsidian/canvas";

export function isFileNode(node: CanvasFileData | CanvasTextData | CanvasLinkData): node is CanvasFileData {
    return (node as CanvasFileData).file !== undefined;
};