import MetadataMenu from "main";
import { TFile } from "obsidian";
import { CanvasData, CanvasEdgeData, CanvasFileData, CanvasLinkData, CanvasNodeData, CanvasTextData } from "obsidian/canvas"
import { FieldType } from "src/types/fieldTypes";
import { FieldsPayload, postValues } from "./postValues";
import { isFileNode } from "src/types/canvasTypes";
import { FieldManager } from "src/fields/FieldManager";

export async function updateCanvas(
    plugin: MetadataMenu,
    forceUpdateOne?: { canvas: TFile }
): Promise<void> {
    const start = Date.now()
    //console.log("start update canvas", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    //retrieve canvas files to screen -> make an index for that?
    const canvases = forceUpdateOne ? [forceUpdateOne.canvas] : plugin.app.vault.getFiles().filter(t => t.extension === "canvas")
    //for each canvas check target nodes' files to see if they contain a Canvas field and populate an index with them


    const orientedEdges = (
        direction: "incoming" | "outgoing" | "bothsides",
        edges: CanvasEdgeData[],
        node: CanvasNodeData
    ): CanvasEdgeData[] => {
        switch (direction) {
            case "incoming":
                return edges.filter(edge => edge.toNode === node.id);
            case "outgoing":
                return edges.filter(edge => edge.fromNode === node.id);
            case "bothsides":
                return edges.filter(edge => edge.fromNode === node.id || edge.toNode === node.id)
            default:
                return [];
        }
    }

    const targetNode = (
        direction: "incoming" | "outgoing" | "bothsides",
        edge: CanvasEdgeData,
        nodes: (CanvasFileData | CanvasTextData | CanvasLinkData)[],
        currentNode: (CanvasFileData | CanvasTextData | CanvasLinkData)
    ): (CanvasFileData | CanvasTextData | CanvasLinkData | undefined) => {
        switch (direction) {
            case "incoming":
                return nodes.find(node => node.id !== currentNode.id && node.id === edge.fromNode);
            case "outgoing":
                return nodes.find(node => node.id !== currentNode.id && node.id === edge.toNode);
            case "bothsides":
                return nodes.find(node => node.id !== currentNode.id && (node.id === edge.toNode || node.id === edge.fromNode));
            default:
                return undefined;
        }
    }

    canvases.forEach(async canvas => {
        const previousFilesPaths = plugin.fieldIndex.canvasLastFiles.get(canvas.path) || []
        const currentFilesPaths: string[] = []
        const { nodes, edges }: CanvasData = JSON.parse(await plugin.app.vault.read(canvas));
        nodes.forEach(async node => {
            if (isFileNode(node) && dvApi) {
                const targetFilePath = node.file
                if (!currentFilesPaths.includes(targetFilePath)) currentFilesPaths.push(targetFilePath)
                const targetFile = app.vault.getAbstractFileByPath(targetFilePath)
                if (targetFile && targetFile instanceof TFile) {
                    //get edges that point to this file
                    const canvasFields = f.filesFields.get(targetFilePath)?.filter(field =>
                        field.type === FieldType.Canvas
                        && field.options.canvasPath === canvas.path
                    )
                    const payload: FieldsPayload = []
                    // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                    canvasFields?.forEach(field => {
                        const { nodeColors, edgeColors, edgeFromSides, edgeToSides, edgeLabels, filesFromDVQuery, direction } = field.options
                        const matchingFiles: string[] | undefined = filesFromDVQuery ?
                            new Function("dv", "current", `return ${filesFromDVQuery}`)(dvApi, dvApi.page(targetFile.path)) :
                            undefined;
                        const matchingEdges = orientedEdges(direction, edges, node)
                        //if (targetFile.name === "Bertrand.md") console.log(node, matchingEdges, field.name, nodeColors, edgeColors, edgeFromSides, edgeToSides, edgeLabels, filesFromDVQuery, direction)
                        const values = matchingEdges
                            //match edgeLabel
                            .filter(edge =>
                                !edgeLabels
                                || edgeLabels.length === 0
                                || edgeLabels.includes(edge.label)
                            )
                            //match edgeColor
                            .filter(edge =>
                                !edgeColors
                                || edgeColors.length === 0
                                || !edge.color && edgeColors.includes("0")
                                || edgeColors.includes(edge.color)
                            )
                            //match edgeFromSide
                            .filter(edge =>
                                !edgeFromSides
                                || edgeFromSides.length === 0
                                || edgeFromSides.includes(edge.fromSide)
                            )
                            //match edgeFromSide
                            .filter(edge =>
                                !edgeToSides
                                || edgeToSides.length === 0
                                || edgeToSides.includes(edge.toSide)
                            )
                            //map corresponding nodes
                            .map(edge => targetNode(direction, edge, nodes, node))
                            //filter only file nodes
                            .filter(node => !!node && isFileNode(node))
                            //match targetNode color
                            .filter((node: CanvasFileData) =>
                                !nodeColors
                                || nodeColors.length === 0
                                || !node.color && nodeColors.includes("0")
                                || nodeColors.includes(node.color)
                            )
                            // filter files matching dvjs query
                            .filter((node: CanvasFileData) => {
                                return matchingFiles === undefined || matchingFiles.map((f: any) => f.file.path).includes(node.file)
                            })
                            .map((node: CanvasFileData) => FieldManager.buildMarkDownLink(plugin, targetFile, node.file))
                        payload.push({ name: field.name, payload: { value: values ? [...(new Set(values))].join(",") : "" } })
                    })
                    if (payload.length) await postValues(plugin, payload, targetFile)
                }
            }
        })
        //clean removed files by putting their related canvas fields to null since they don't have anymore connections
        previousFilesPaths.filter(f => !currentFilesPaths.includes(f)).forEach(async filePath => {
            const targetFile = app.vault.getAbstractFileByPath(filePath)
            if (targetFile && targetFile instanceof TFile) {
                const canvasFields = f.filesFields.get(filePath)?.filter(field =>
                    field.type === FieldType.Canvas
                    && field.options.canvasPath === canvas.path
                )
                const payload: FieldsPayload = []
                // for each canvas field, if the canvas field match the conditions, then, add the origin file to the target canvas field list of files
                canvasFields?.forEach(field => { payload.push({ name: field.name, payload: { value: "" } }) })
                if (payload.length) await postValues(plugin, payload, targetFile)
            }
        })

        //
        plugin.fieldIndex.canvasLastFiles.set(canvas.path, currentFilesPaths)
    })
}
