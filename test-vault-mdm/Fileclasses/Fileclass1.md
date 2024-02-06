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
  - J5EFhm
  - MBeS53
  - Ex2xQN
  - 758IjN
  - UxpKAm
  - 6sXHU9
  - K8wzlg
  - LntcEP
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
    id: LntcEP
  - name: calories
    type: Input
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    path: ""
    id: K8wzlg
  - name: distance
    type: Input
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    path: ""
    id: 6sXHU9
  - name: time
    type: Input
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    path: ""
    id: UxpKAm
  - name: push-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: 758IjN
  - name: pull-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 5
    style:
      bold: true
    path: ""
    id: Ex2xQN
  - name: squats
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: MBeS53
  - name: bpm
    type: Number
    options: {}
    style:
      bold: true
    path: ""
    id: J5EFhm
---