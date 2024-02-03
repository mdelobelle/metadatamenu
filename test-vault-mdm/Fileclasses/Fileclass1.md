---
limit: 100
mapWithTag: true
icon: dumbbell
tagNames:
  - Tag1
filesPaths:
  - Folder1
  - Folder2
bookmarksGroups:
  - group1
  - group2
  - group3
excludes: 
extends: 
savedViews: []
favoriteView: 
fieldsOrder:
  - wve1Gr
  - FFnOPP
  - LxKPyo
  - LYN7lR
  - FUaKXR
  - 3bQuKB
  - UB37DW
  - mUDWnQ
version: "2.14"
fields:
  - name: activities
    type: Multi
    options:
      sourceType: ValuesList
      valuesList:
        "1": 🏃🏻‍♂️
        "2": 🏋🏻‍♀️
        "3": ⏸️
        "4": 🥊
        "5": ⛷
        "6": 🏄🏻‍♂️
        "7": 🚶🏻‍♂️
        "8": 🤕
        "9": ❓
    path: ""
    id: mUDWnQ
  - name: calories
    type: Input
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    path: ""
    id: UB37DW
  - name: distance
    type: Input
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    path: ""
    id: 3bQuKB
  - name: time
    type: Input
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    path: ""
    id: FUaKXR
  - name: push-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: LYN7lR
  - name: pull-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 5
    style:
      bold: true
    path: ""
    id: LxKPyo
  - name: squats
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: FFnOPP
  - name: bpm
    type: Number
    options: {}
    style:
      bold: true
    path: ""
    id: wve1Gr
---