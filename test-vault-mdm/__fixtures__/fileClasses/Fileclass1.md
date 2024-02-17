---
limit: 100
mapWithTag: true
icon: dumbbell
tagNames: Tag1
excludes: 
extends: 
version: "2.1"
fields:
  - id: djJ9mH
    name: activities
    options:
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
      sourceType: ValuesList
    type: Multi
    path: ""
  - id: 8w5EAz
    name: calories
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    type: Input
    path: ""
  - id: vMJFH9
    name: distance
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    type: Input
    path: ""
  - id: DiyBNg
    name: time
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    type: Input
    path: ""
  - id: CwftRO
    name: push-ups
    options:
      step: 10
      min: 0
      max: 1000
    style:
      bold: true
    type: Number
    path: ""
  - id: ANUgFR
    name: pull-ups
    options:
      step: 5
      min: 0
      max: 1000
    style:
      bold: true
    type: Number
    path: ""
  - id: YHFlAp
    name: squats
    options:
      step: 10
      min: 0
      max: 1000
    style:
      bold: true
    type: Number
    path: ""
  - id: H6TV3Z
    name: bpm
    options: {}
    style:
      bold: true
    type: Number
    path: ""
filesPaths:
  - Folder1
  - Folder2
bookmarksGroups:
  - group1
  - group2
  - group3
savedViews: 
favoriteView: 
---
