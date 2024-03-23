import { IField } from "src/fields/Field"
import { LinePosition } from "src/note/line"
import { Options as MediaOptions } from "src/fields/models/Media";
import { extensionMediaTypes, MediaType } from "src/types/mediaTypes";

type MediaField = IField<MediaOptions>

export function renderMediaItem(location: LinePosition, filename: string, field: MediaField) {
    const { embed, thumbnailSize } = field.options
    const extension = filename.split(".").last()
    if (!extension) return ""
    const alias = extensionMediaTypes[extension] === MediaType.Image ? thumbnailSize : undefined
    switch (location) {
        case "yaml":
            return `[[${filename}]]`
        case "inline":
            return `${embed ? "!" : ""}[[${filename}${alias ? "|" + alias : ""}]]`
    }
}