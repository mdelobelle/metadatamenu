import * as parser from "src/utils/parser"

test('link encoding', () => {
    expect(parser.encodeLink('[[lien]]')).toBe('🔧🐀lien🐓🕌')
})

test('link decoding', () => {
    expect(parser.decodeLink('🔧🐀lien🐓🕌')).toBe('[[lien]]')
})

test('frontmatter attribute', () => {
    expect(parser.frontMatterLineField('fieldName:value')).toBe('fieldName')
})


test('frontmatter attribute with space', () => {
    expect(parser.frontMatterLineField('fieldName :value')).toBe('fieldName')
})

test('parse line with starting inline dataview field', () => {
    expect(parser.getLineFields('fieldName:: value')).toEqual([
        {
            attribute: 'fieldName',
            values: 'value',
            index: 0,
            length: 17
        }
    ])
})

test('parse line with inner inline dataview fields', () => {
    expect(parser.getLineFields('this is a line with [fieldNameA:: A] and (fieldNameB:: B1, B2) and [link::[[Link1]], [[link2]]] complex')).toEqual([
        {
            attribute: 'fieldNameA',
            values: 'A',
            index: 20,
            length: 16
        },
        {
            attribute: 'fieldNameB',
            values: 'B1, B2',
            index: 41,
            length: 21
        },
        {
            attribute: 'link',
            values: '[[Link1]], [[link2]]',
            index: 67,
            length: 36
        }
    ])
})