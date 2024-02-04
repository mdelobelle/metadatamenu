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
  - Z9bAqx
  - bEFR7W
  - cu0348
  - Z0ijjW
  - slCUzt
  - sqaCTD
  - a6MJ30
  - 8xKUWy
version: "2.15"
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
    id: 8xKUWy
  - name: calories
    type: Input
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    path: ""
    id: a6MJ30
  - name: distance
    type: Input
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    path: ""
    id: sqaCTD
  - name: time
    type: Input
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    path: ""
    id: slCUzt
  - name: push-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: Z0ijjW
  - name: pull-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 5
    style:
      bold: true
    path: ""
    id: cu0348
  - name: squats
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: bEFR7W
  - name: bpm
    type: Number
    options: {}
    style:
      bold: true
    path: ""
    id: Z9bAqx
---