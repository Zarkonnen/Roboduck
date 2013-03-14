var es =
{
  "problems": [
    {
      "idCounter": 16,
      "text": "My computer won't start up.",
      "causes": [
        { "id": 0, "text": "The power cord is unplugged.", "weight": 10 },
        { "id": 1, "text": "The power supply exploded.",   "weight": 1  }
      ],
      "tests": [
        {
          "id": 2,
          "text": "Check the power cord is plugged in.",
          "cost" : 1,
          "outcomes": [
            { "id": 3, "text": "Yes", "eliminates": [ 0 ] },
            { "id": 4, "text": "No",  "eliminates": []    }
          ]
        },
        {
          "id": 5,
          "text": "Disassemble machine and check PSU.",
          "cost" : 10,
          "outcomes": [
            { "id": 6, "text": "PSU Exploded", "eliminates": [ 1 ] },
            { "id": 7, "text": "PSU Fine",     "eliminates": []    },
          ]
        }
      ],
      "steps": [
        {
          "id": 8,
          "type": "addProblem",
          "text": "My computer won't start up."
        },
        {
          "id": 9,
          "type": "addCauses",
          "causes": [ 0, 1 ]
        },
        {
          "id": 10,
          "type": "addTests",
          "tests": [ 2, 5 ]
        },
        {
          "id": 11,
          "type": "duckSuggestion",
          "test": 2
        },
        {
          "id": 12,
          "type": "testDone",
          "testsAvailable": [ 2, 5 ],
          "test": 2,
          "outcome": 3
        },
        {
          "id": 13,
          "type": "duckSuggestion",
          "test": 5
        },
        {
          "id": 14,
          "type": "testDone",
          "testsAvailable": [ 5 ],
          "test": 5,
          "outcome": 6
        },
        {
          "id": 15,
          "type": "duckConclusion",
          "cause": 1
        }
      ]
    }
  ]
};