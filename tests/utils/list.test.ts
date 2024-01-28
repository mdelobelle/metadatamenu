import * as App from "obsidian"
import { getListBoundsFromListItemCacheList } from "src/utils/list"

const DEBUG = true

const listItems: App.ListItemCache[] = [
    {
        "position": {
            "start": {
                "line": 0,
                "col": 0,
                "offset": 0
            },
            "end": {
                "line": 0,
                "col": 3,
                "offset": 3
            }
        },
        "parent": -1
    },
    {
        "position": {
            "start": {
                "line": 1,
                "col": 0,
                "offset": 4
            },
            "end": {
                "line": 1,
                "col": 3,
                "offset": 7
            }
        },
        "parent": -1
    },
    {
        "position": {
            "start": {
                "line": 2,
                "col": 1,
                "offset": 9
            },
            "end": {
                "line": 2,
                "col": 4,
                "offset": 12
            }
        },
        "parent": 1
    },
    {
        "position": {
            "start": {
                "line": 3,
                "col": 1,
                "offset": 14
            },
            "end": {
                "line": 3,
                "col": 4,
                "offset": 17
            }
        },
        "parent": 1
    },
    {
        "position": {
            "start": {
                "line": 4,
                "col": 0,
                "offset": 18
            },
            "end": {
                "line": 4,
                "col": 3,
                "offset": 21
            }
        },
        "parent": -1
    },
    {
        "position": {
            "start": {
                "line": 5,
                "col": 1,
                "offset": 23
            },
            "end": {
                "line": 5,
                "col": 4,
                "offset": 26
            }
        },
        "parent": 4
    },
    {
        "position": {
            "start": {
                "line": 6,
                "col": 1,
                "offset": 28
            },
            "end": {
                "line": 6,
                "col": 4,
                "offset": 31
            }
        },
        "parent": 4
    },
    {
        "position": {
            "start": {
                "line": 7,
                "col": 1,
                "offset": 33
            },
            "end": {
                "line": 7,
                "col": 4,
                "offset": 36
            }
        },
        "parent": 4
    },
    {
        "position": {
            "start": {
                "line": 8,
                "col": 2,
                "offset": 39
            },
            "end": {
                "line": 8,
                "col": 5,
                "offset": 42
            }
        },
        "parent": 7
    },
    {
        "position": {
            "start": {
                "line": 9,
                "col": 0,
                "offset": 43
            },
            "end": {
                "line": 10,
                "col": 0,
                "offset": 47
            }
        },
        "parent": -1
    },
    {
        "position": {
            "start": {
                "line": 11,
                "col": 0,
                "offset": 48
            },
            "end": {
                "line": 11,
                "col": 3,
                "offset": 51
            }
        },
        "parent": -1
    },
    {
        "position": {
            "start": {
                "line": 12,
                "col": 0,
                "offset": 52
            },
            "end": {
                "line": 13,
                "col": 1,
                "offset": 57
            }
        },
        "parent": -1
    }
]

test('list bounds', () => {
    expect(getListBoundsFromListItemCacheList(listItems, 0)).toEqual({ start: 0, end: 9 })
})