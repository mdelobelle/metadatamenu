import MetadataMenu from "main";
import { App, TFile } from "obsidian";
import { MetadataMenuApi } from "src/MetadataMenuApi";
import kimiNoNaWaMetadataMock from "./ResponseMocks/KimiNoNaWaMetadataCache.json"
import { readFileSync } from "fs";
import kimiNoNaWaTFile from "./ResponseMocks/KimiNoNaWaTFile.json";
import path from "path";

let mockFileContents: string;
let mockPlugin: MetadataMenu;
let mockAppGenerator: (tfile: TFile, fileContents: string, fileMetadata: any) => App;

beforeAll(() => {
    mockAppGenerator = (tfile: TFile, fileContents: string, fileMetadata: any) => {
        return {
            app: {
                vault: {
                    getAbstractFileByPath: (_path: string): TFile => {
                        return tfile;
                    },
                    cachedRead: async (_tfile: TFile): Promise<string> => { return fileContents; }
                },
                metadataCache: {
                    getFileCache: (_tfile: TFile): any => { return fileMetadata; }
                }
            }
        } as unknown as App;
    }
})

test('getting metadata from Kimi no Na Wa', async () => {
    const castedTFile = kimiNoNaWaTFile as TFile;
    mockFileContents = readFileSync(path.resolve(__dirname, './ResponseMocks/Kimi no Na wa (2016).md')).toLocaleString();
    mockPlugin = { ...mockAppGenerator(castedTFile, mockFileContents, kimiNoNaWaMetadataMock) } as unknown as MetadataMenu;
    const api = new MetadataMenuApi(mockPlugin).make();
    expect(api.getValues(castedTFile, "title")).resolves.toEqual('Kimi no Na wa.');
    expect(api.getValues(castedTFile, "name")).resolves.toEqual(undefined);
    expect(api.getValues(castedTFile, "genres")).resolves.toEqual(['Drama', 'Supernatural']);
    expect(api.getValues(castedTFile, "personalRating")).resolves.toEqual(0);
    expect(api.getValues(castedTFile, "watch")).resolves.toEqual(false);
})