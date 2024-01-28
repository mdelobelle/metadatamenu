import * as parser from "src/utils/parser"
import { postValues } from "src/commands/postValues"
import MetadataMenu from "main"


const manifest = {
    "id": "metadata-menu",
    "name": "Metadata Menu",
    "version": "0.7.7",
    "minAppVersion": "1.4.16",
    "description": "For data quality enthusiasts (and dataview lovers): manage the metadata of your notes.",
    "author": "mdelobelle",
    "authorUrl": "https://github.com/mdelobelle",
    "isDesktopOnly": false,
    "fundingUrl": "https://github.com/sponsors/mdelobelle/",
    "helpUrl": "https://mdelobelle.github.io/metadatamenu/"
}


const plugin = new MetadataMenu(app, manifest)

test('post values', async () => {
    expect(postValues(plugin, [{ indexedPath: "cplwkQ", payload: { value: "1234" } }], "Dummy file 1.md")).resolves
})

/*
test('link encoding', () => {
    expect(parser.encodeLink('[[lien]]')).toBe('€ùlienù€')
})

test('link decoding', () => {
    expect(parser.decodeLink('€ùlienù€')).toBe('[[lien]]')
})

test('frontmatter attribute', () => {
    expect(parser.frontMatterLineField('fieldName:value').attribute).toBe('fieldName')
})


test('frontmatter attribute with space', () => {
    expect(parser.frontMatterLineField('fieldName :value').attribute).toBe('fieldName')
})

test('parse line with starting inline dataview field', () => {
    expect(parser.getLineFields('fieldName:: value')).toEqual([
        {
            afterSeparatorSpacer: " ",
            attribute: 'fieldName',
            beforeSeparatorSpacer: "",
            endStyle: "",
            inList: undefined,
            inQuote: undefined,
            preSpacer: undefined,
            index: 0,
            length: 17,
            startStyle: "",
            values: 'value'
        }
    ])
})

test('parse line with inner inline dataview fields', () => {
    expect(parser.getLineFields('this is a line with [fieldNameA:: A] and (fieldNameB:: B1, B2) and [link:: [[Link1]], [[link2]]] complex')).toEqual([
        {
            afterSeparatorSpacer: " ",
            attribute: 'fieldNameA',
            beforeSeparatorSpacer: "",
            enclosureType: "brackets",
            endStyle: "",
            inList: undefined,
            inQuote: undefined,
            preSpacer: undefined,
            index: 20,
            length: 16,
            startStyle: "",
            values: 'A'
        },
        {
            afterSeparatorSpacer: " ",
            attribute: 'fieldNameB',
            beforeSeparatorSpacer: "",
            enclosureType: "parenthesis",
            endStyle: "",
            inList: undefined,
            inQuote: undefined,
            preSpacer: undefined,
            index: 41,
            length: 21,
            startStyle: "",
            values: 'B1, B2'
        },
        {
            afterSeparatorSpacer: " ",
            attribute: 'link',
            beforeSeparatorSpacer: "",
            enclosureType: "brackets",
            endStyle: "",
            inList: undefined,
            inQuote: undefined,
            preSpacer: undefined,
            index: 67,
            length: 29,
            startStyle: "",
            values: '[[Link1]], [[link2]]'
        }
    ])
})
*/