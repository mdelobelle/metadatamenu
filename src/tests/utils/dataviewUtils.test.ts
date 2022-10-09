import { genuineKeys } from "src/utils/dataviewUtils";

const dvFile = {
    "file": {},
    "Difficulty": 30,
    "fileClass": "Guitar",
    "Artist": {
        "path": "The Beatles",
        "type": "file",
        "embed": false
    },
    "Course": null,
    "Masterization": "⭐️⭐️⭐️",
    "Next Session": {
        "path": "📆/📅/2022-10-02 Sun",
        "type": "file",
        "embed": false
    },
    "Next Interval": "P1D",
    "Chords": "A,C",
    "difficulty": 30,
    "fileclass": "Guitar",
    "artist": {
        "path": "The Beatles",
        "type": "file",
        "embed": false
    },
    "course": null,
    "masterization": "⭐️⭐️⭐️",
    "next-session": {
        "path": "📆/📅/2022-10-02 Sun",
        "type": "file",
        "embed": false
    },
    "next-interval": "P1D",
    "chords": "A,C"
}

test('genuine keys', () => {
    expect(genuineKeys(dvFile)).toEqual([
        "file",
        "Difficulty",
        "fileClass",
        "Artist",
        "Course",
        "Masterization",
        "Next Session",
        "Next Interval",
        "Chords"
    ])
})