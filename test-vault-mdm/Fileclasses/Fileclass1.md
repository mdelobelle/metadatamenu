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
  - Ht8cMj
  - yQm76Z
  - A76jQk
  - rhjyuV
  - 5H7H4h
  - Vk1wyn
  - 51W7cE
  - qsr5lu
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
    id: qsr5lu
  - name: calories
    type: Input
    options:
      template: "{{calories}} KCal"
    style:
      bold: true
    path: ""
    id: 51W7cE
  - name: distance
    type: Input
    options:
      template: "{{distance}} km"
    style:
      bold: true
      italic: true
    path: ""
    id: Vk1wyn
  - name: time
    type: Input
    options:
      template: "`{{hours}}:{{minutes}}:{{seconds}}`"
    style:
      bold: true
    path: ""
    id: 5H7H4h
  - name: push-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: rhjyuV
  - name: pull-ups
    type: Number
    options:
      min: 0
      max: 1000
      step: 5
    style:
      bold: true
    path: ""
    id: A76jQk
  - name: squats
    type: Number
    options:
      min: 0
      max: 1000
      step: 10
    style:
      bold: true
    path: ""
    id: yQm76Z
  - name: bpm
    type: Number
    options: {}
    style:
      bold: true
    path: ""
    id: Ht8cMj
---