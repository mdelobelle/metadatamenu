export enum MediaType {
    Audio = "Audio",
    Image = "Image",
    Video = "Video"
}

export const extensionMediaTypes: Record<string, MediaType> = {
    avif: MediaType.Image,
    bmp: MediaType.Image,
    gif: MediaType.Image,
    jpg: MediaType.Image,
    jpeg: MediaType.Image,
    png: MediaType.Image,
    svg: MediaType.Image,
    tif: MediaType.Image,
    tiff: MediaType.Image,
    webp: MediaType.Image,
}

export type DisplayType = "list" | "card"