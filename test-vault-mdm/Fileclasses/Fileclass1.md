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
  - Vk6D7h
  - wBUleJ
  - vZMbil
  - sDMLvT
  - jcs1gS
  - Fv5vUx
  - pPNbXO
  - oz7oCY
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
    id: oz7oCY
  - name: calories
    type: Input
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    path: ""
    id: pPNbXO
  - name: distance
    type: Input
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    path: ""
    id: Fv5vUx
  - name: time
    type: Input
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    path: ""
    id: jcs1gS
  - name: push-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: sDMLvT
  - name: pull-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 5
    style:
      bold: true
    path: ""
    id: vZMbil
  - name: squats
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: wBUleJ
  - name: bpm
    type: Number
    options: {}
    style:
      bold: true
    path: ""
    id: Vk6D7h
---