# Writing frontmatter (agents & scripts)

This page is a **conformance-oriented quick reference** for anyone — a human, a
script, or an AI assistant — writing note frontmatter that Metadata Menu will
consider valid. It complements the detailed [Fields](fields.md),
[FileClasses](fileclasses.md) and [API](api.md) pages: they describe each field's
behaviour and options in depth; this page collects, in one place, *the exact value
shape to write per type* and *the recipe for authoring conformant frontmatter
programmatically*.

!!! abstract "The mental model"
    A **fileClass is a schema**; a note's **frontmatter is an instance** of it; a
    **field type is the contract** on each value. Write values that match the
    contract and the field is *valid*; write valid-looking YAML that ignores the
    contract and Metadata Menu will flag it *invalid*.

## The golden rule: read the contract before you write the instance

A field's type and allowed values are defined either in a
[fileClass](fileclasses.md) (its `fields:` array) or in the plugin's
[preset fields](settings.md#preset-field-settings). Before writing a note's
frontmatter:

1. Determine which fileClass(es) [map to the note](fileclasses.md#file-mapping).
2. Read that fileClass's field definitions — or, at runtime, call
   [`namedFileFields(file)`](api.md#namedfilefields), which returns each field's
   `type`, `options`, and `isValid`.
3. Write values that match each field's type (table below).

!!! warning "Valid YAML ≠ a valid field"
    YAML parsing success tells you nothing about conformance. A `Select` field
    set to a value outside its option list parses fine and is still invalid.
    `isValid` from [`fileFields`](api.md#filefields) is the real check.

## Value shape per field type

| Type | Accepts | Frontmatter value to write |
|---|---|---|
| [Input](fields.md#input) | any string | `title: Anything` |
| [Boolean](fields.md#boolean) | `true`/`false` (anything not `true` → `false`) | `done: true` |
| [Number](fields.md#number) | int or float | `count: 42` · `ratio: 0.75` |
| [Select](fields.md#select) | one value **from the option list** | `status: Active` |
| [Multi](fields.md#multi) | many values from the list | `tags: [a, b]` or an indented list |
| [Cycle](fields.md#cycle) | one value from the list | `phase: Draft` |
| [File](fields.md#file) | one internal link | `parent: "[[Some Note]]"` |
| [MultiFile](fields.md#multi-file) | many internal links | `refs: ["[[A]]", "[[B]]"]` |
| [Media](fields.md#media) / [MultiMedia](fields.md#multimedia) | media link(s) | `cover: "[[img.png]]"` |
| [Date](fields.md#date) | a date (moment.js format) | `due: 2026-07-16` or `"[[2026-07-16]]"` |
| [DateTime](fields.md#datetime) | date + time | `at: 2026-07-16T14:30` |
| [Time](fields.md#time) | a time | `alarm: "14:30"` |
| [Lookup](fields.md#lookup) | *computed by the plugin* | do not hand-author |
| [Formula](fields.md#formula) | *computed by the plugin* | do not hand-author |
| [Canvas / CanvasGroup / CanvasGroupLink](fields.md#canvas) | *computed from a canvas* | do not hand-author |
| [JSON](fields.md#json) | a JSON object | serialized JSON-in-YAML |
| [YAML](fields.md#yaml) | a YAML object *(frontmatter only)* | a nested YAML block |
| [Object](fields.md#object) | nested child fields *(frontmatter only)* | indented YAML (see below) |
| [ObjectList](fields.md#object-list) | a list of objects *(frontmatter only)* | a YAML list of indented blocks |

!!! note "Multi-value display"
    A `Multi`/`MultiFile` field's **Frontmatter List display type** setting
    accepts either form — both are valid:
    ```yaml
    tags: [pkm, music]      # inline array
    tags:                   # indented list (equivalent)
      - pkm
      - music
    ```

!!! note "Select/Multi/Cycle options"
    In the note you write the **label** (`grade: A`), never the option index. The
    index → label map lives in the [field definition](fields.md#select).

## Nested fields (Object / ObjectList)

`Object` and `ObjectList` fields are written as ordinary indented YAML:

```yaml
Employees:                       # ObjectList
  - Name: John Doe               # each list item is an Object
    Role: CFO
    Contact Info:                # a nested Object
      e-mail: john@acme.ob
  - Name: Ann Martin
    Role: CEO
```

To target a single instance programmatically you need its
[`indexedPath`](fields.md#indexed-path) — e.g. `dx8Mth[0]____Y0dsfZ____hRlSsW`
for the first employee's e-mail. The [named API](api.md#postnamedfieldsvalues)
lets you avoid computing it for top-level fields.

## Authoring programmatically

Prefer the [API](api.md) over writing raw YAML when code is driving the note — it
respects field types, list display, and insertion rules for you.

**Set values by field name** (no `indexedPath` needed):

```javascript
await MetadataMenu.api.postNamedFieldsValues(
  file,
  [
    { name: "status", payload: { value: "Active" } },
    { name: "tags",   payload: { value: "[pkm, music]" } }
  ]
  // omit lineNumber → the field is created in the frontmatter if missing
);
```

!!! tip "`value` is always a string"
    Every payload `value` is passed as a string; Metadata Menu parses it
    according to the field's type. `"true"`, `"42"`, `"[a, b]"`, `"[[A Note]]"`.

**Scaffold a note from its fileClass** — insert every field the class defines that
the note is missing, in the class's field order:

```javascript
await MetadataMenu.api.insertMissingFields(
  file, lineNumber, /*asList*/ false, /*asBlockquote*/ false /*, fileClassName */
);
```

**Introspect + validate** before and after writing:

```javascript
const fields = await MetadataMenu.api.namedFileFields(file);
// each entry: { value, type, options, isValid, sourceType, id, fileClassName }
```

!!! info "The source is the truth"
    The API's live signatures are in
    [`src/MetadataMenuApi.ts`](https://github.com/mdelobelle/metadatamenu/blob/master/src/MetadataMenuApi.ts).
    Where a doc example and the source disagree, trust the source.

## A quick checklist

- [ ] Identified the note's fileClass(es).
- [ ] Read the field definitions (types + options), or `namedFileFields(file)`.
- [ ] Wrote each value in the shape its type expects.
- [ ] Left `Lookup`/`Formula`/`Canvas*` fields for the plugin to compute.
- [ ] Verified with `isValid` — not just "the YAML parses."
