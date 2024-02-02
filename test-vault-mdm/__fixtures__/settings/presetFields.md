---
fields:
  - name: Simple Input
    type: Input
    tagName: single
    icon: pencil
    tooltip: Accepts any value
    colorClass: single
    id: j3etl8
    options: {}
    command:
    style:
    path: ""
  - name: Input With Template
    type: Input
    tagName: single
    icon: pencil
    tooltip: Accepts any value
    colorClass: single
    options:
      template: toto {{Test}}
    id: j3etl8
    command:
    style:
    path: ""
  - name: Simple multi
    type: Multi
    tagName: multi
    icon: bullet-list
    tooltip: Accepts multiple values from a list
    colorClass: multi
    id: j3etl9
    path: ""
    options:
      valuesList:
        "1": 🟢
        "2": 🟡
        "3": 🟠
        "4": 🔴
      sourceType: ValuesList
  - name: Multi With Note List
    type: Multi
    tagName: multi
    icon: bullet-list
    tooltip: Accepts multiple values from a list
    colorClass: multi
    id: j3etla
    path: ""
    options:
      sourceType: ValuesListNotePath
      valuesList: {}
      valuesListNotePath: Settings/lists/Area.md
  - name: Select With DvQuery
    type: Select
    tagName: select
    icon: right-triangle
    tooltip: Accepts a single value from a list
    colorClass: select
    id: j3etlb
    path: ""
    options:
      sourceType: ValuesFromDVQuery
      valuesList: {}
      valuesFromDVQuery: dv.pages('"Ressources"').where(p => ["Article", "Book"].includes(p.fileClass)).map(p => p.file.name)
  - name: Cycle with allow null
    id: KhR8UU
    options:
      valuesList:
        "1": 🌱
        "2": 🌱🌱
        "3": 🌱🌱🌱
        "4": 🌱🌱🌱🌱
        "5": 🌱🌱🌱🌱🌱
      sourceType: "ValuesList"
      allowNull: true
    type: Cycle
    tagName: cycle
    icon: switch
    tooltip: Cycles through values from a list
    colorClass: cycle
    path: ""
  - name: Number with step min and max
    id: CwftRO
    options:
      step: 10
      min: 0
      max: 1000
    type: Number
    tagName: number
    icon: plus-minus-glyph
    tooltip: Accepts a number
    colorClass: number
    path: ""
  - name: Boolean
    id: CwftRx
    options: {}
    type: Boolean
    tagName: boolean
    icon: toggle-left
    tooltip: Accepts true or false
    colorClass: boolean
    path: ""
  - name: Simple Date
    id: CwftRy
    options:
      dateFormat: YYYY-MM-DD ddd
      defaultInsertAsLink: false
      dateShiftInterval: 1 day
      linkPath: ""
    type: Date
    tagName: date
    icon: calendar-with-checkmark
    tooltip: Accepts a date
    colorClass: date
    path: ""
  - name: Datetime with link path and cycle
    id: CwftRy
    options:
      dateFormat: YYYY-MM-DD ddd
      defaultInsertAsLink: true
      dateShiftInterval: 1 day
      linkPath: "Calendar/"
      nextShiftIntervalField: Cycle with allow null
    type: DateTime
    tagName: date
    icon: calendar-clock
    tooltip: Accepts a date with time
    colorClass: date
    path: ""
  - name: Simple Time with link path
    id: CwftRy
    options:
      dateFormat: HH:mm:ss
      dateShiftInterval: 1 hour
      linkPath: ""
      defaultInsertAsLink: false
    type: Time
    tagName: time
    icon: clock-4
    tooltip: Accepts a time
    colorClass: time
    path: ""
---
