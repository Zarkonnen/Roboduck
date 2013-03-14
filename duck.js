var DEFAULT_LIKELIHOOD = "Possible";
var DEFAULT_COST = "About 10 Minutes";

var data = {
  "currentProblem": 0,
  "problems": [
    {
      "idCounter": 1,
      "text": "",
      "causes": [],
      "tests": [],
      "steps": [
        {
          "id": 0,
          "type": "addProblem"
        }
      ]
    }
  ]
};

if (localStorage) {
  if (localStorage.roboduck_data) {
    data = JSON.parse(localStorage.roboduck_data);
  }
}

function save() {
  if (localStorage) {
    localStorage.roboduck_data = JSON.stringify(data);
  }
}

var problem = data.problems[data.currentProblem || 0];

function calculateDuckConclusion() {
  return findTestsAvailable().length == 0 ? problem.causes[0].id : null; // qqDPS NEED THE ALGORITHM! :P
}

function calculateDuckSuggestion() {
  return findTestsAvailable()[0]; // qqDPS NEED THE ALGORITHM! :P
}

function findTestsAvailable() {
  var ids = [];
  problem.tests.forEach(function(test) {
    if (!test.done) {
      ids.push(test.id);
    }
  });
  return ids;
}

function g(id) {
  for (var i = 0; i < problem.causes.length; i++) {
    if (problem.causes[i].id == id) { return problem.causes[i]; }
  }
  for (var i = 0; i < problem.tests.length; i++) {
    if (problem.tests[i].id == id) { return problem.tests[i]; }
    for (var j = 0; j < problem.tests[i].outcomes.length; j++) {
      if (problem.tests[i].outcomes[j].id == id) { return problem.tests[i].outcomes[j]; }
    }
  }
  for (var i = 0; i < problem.steps.length; i++) {
    if (problem.steps[i].id == id) { return problem.steps[i]; }
  }
}

function t(name, obj, kv) {
  var template = Handlebars.compile($("#t_" + name).html());
  var ctx = {};
  if (obj) { for (x in obj) { ctx[x] = obj[x]; } }
  if (kv ) { for (x in kv ) { ctx[x] = kv [x]; } }
  return template(ctx);
}

function stepCtx(id) {
  for (var i = 0; i < problem.steps.length; i++) {
    if (problem.steps[i].id == id) {
      return {
        "step": problem.steps[i],
        "prev": i == 0 ? null : problem.steps[i - 1],
        "next": i == problem.steps.length - 1 ? null : problem.steps[i + 1]
      };
    }
  }
}

function problemOK(id) {
  var ctx = stepCtx(id);
  if (ctx.next) { return; }
  var text = $("#" + id + "_input").val();
  if (text == "") { return; }
  problem.text = text;
  var addCauses = {
    "type": "addCauses",
    "id": problem.idCounter++,
    "causes": [],
    "editingCauses": [
      { "id": problem.idCounter++, "text": "", "p": DEFAULT_LIKELIHOOD },
      { "id": problem.idCounter++, "text": "", "p": DEFAULT_LIKELIHOOD }
    ]
  };
  problem.steps.push(addCauses);
  $("#" + id).after(stepHtml(ctx.step, ctx.prev, addCauses)).remove();
  $("#content").append(stepHtml(addCauses, ctx.step, null));
  wireStep(addCauses);
  save();
  updateMenu();
}

function causesOK(id) {
  var ctx = stepCtx(id);
  if (ctx.next) { return; }
  if (ctx.step.editingCauses.every(function(cause) { return cause.text == ""; })) { return; }
  ctx.step.editingCauses.forEach(function(cause) {
    if (cause.text == "") { return; }
    problem.causes.push(cause);
    ctx.step.causes.push(cause.id);
  });
  
  var addTests = {
    "type": "addTests",
    "id": problem.idCounter++,
    "tests": [],
    "editingTests": [
      { "id": problem.idCounter++, "text": "", "cost": DEFAULT_COST, "outcomes": [] }
    ]
  };
  problem.steps.push(addTests);
  $("#" + id).after(stepHtml(ctx.step, ctx.prev, addTests)).remove();
  $("#content").append(stepHtml(addTests, ctx.step, null));
  wireStep(addTests);
  save();
}

function testsOK(id) {
  var ctx = stepCtx(id);
  if (ctx.next) { return; }
  var viableTests = [];
  ctx.step.editingTests.forEach(function(test) {
    if (test.text == "") { return; }
    test.outcomes = test.outcomes.filter(function(outcome) { return outcome.text != "" });
    if (test.outcomes.length < 2) { return; }
    viableTests.push(test);
  });
  
  if (viableTests.length == 0) { return; }
  
  $("#" + ctx.step.editingTests[ctx.step.editingTests.length - 1].id + "_done").addClass("chosen");
  $("#" + ctx.step.editingTests[ctx.step.editingTests.length - 1].id + "_or").addClass("notchosen");
  
  viableTests.forEach(function(test) {
    problem.tests.push(test);
    ctx.step.tests.push(test.id);
  });
  
  newSuggestion(ctx);
  save();
}

function testDone(id, step) {
  var ctx = stepCtx(step.id);
  if (ctx.next) { return; }
  step.test = id;
  $("#" + step.id + "_outcomes").html(
    t("testDone_outcomes", step, {
      "outcomes": g(step.test).outcomes.map(function(outcome) {
        return t("outcomeHappened", outcome, { "id": step.id + "_" + outcome.id, "chosen": step.outcome == outcome.id, "notchosen": step.outcome != -1 });
      }).join("\n")
    })
  );
  
  step.testsAvailable.forEach(function(testID) {
    if (id == testID) {
      $("#" + step.id + "_" + testID + "_done").addClass("chosen").removeClass("notchosen");
    } else {
      $("#" + step.id + "_" + testID + "_done").addClass("notchosen").removeClass("chosen");
    }
  });
  
  wireOutcomesHappened(id, step);
  
  bottom();
  save();
}

function outcomeHappened(outcome, test, step) {
  outcome.happened = true;
  test.done = true;
  step.outcome = outcome.id;
  newSuggestion(stepCtx(step.id));
  save();
}

function newSuggestion(ctx) {
  var conc = calculateDuckConclusion();
  
  if (conc) {
    var duckConclusion = {
      "type": "duckConclusion",
      "id": problem.idCounter++,
      "cause": conc
    };
    problem.steps.push(duckConclusion);
    $("#" + ctx.step.id).after(stepHtml(ctx.step, ctx.prev, duckConclusion)).remove();
    $("#content").append(stepHtml(duckConclusion, ctx.step, null));
    wireStep(duckConclusion);
    bottom();
  } else {
    var duckSuggestion = {
      "type": "duckSuggestion",
      "id": problem.idCounter++,
      "test": calculateDuckSuggestion()
    };
    problem.steps.push(duckSuggestion);
    $("#" + ctx.step.id).after(stepHtml(ctx.step, ctx.prev, duckSuggestion)).remove();
    $("#content").append(stepHtml(duckSuggestion, ctx.step, null));
    var testDone = {
      "type": "testDone",
      "id": problem.idCounter++,
      "testsAvailable": findTestsAvailable(),
      "test": -1,
      "outcome": -1
    };
    problem.steps.push(testDone);
    $("#content").append(stepHtml(testDone, duckSuggestion, null));
    wireStep(testDone);
    bottom();
  }
}

function wireStep(step) {
  stepWirers[step.type](step);
  bottom();
}

function bottom() {
  window.scrollTo(0, document.body.scrollHeight);
}

var stepWirers = {
  "addProblem": function(step) {
    $("#" + step.id + "_ok").click(function() { problemOK(step.id); });
    $("#" + step.id + "_input").keyup(function (e) {
      if (e.keyCode == 13) {
        problemOK(step.id);
      }
    }).focus();
  },
  "addCauses": function(step) {
    step.editingCauses.forEach(function(cause) { wireEditingCause(cause, step); });
    $("#" + step.editingCauses[0].id + "_input").focus();
    $("#" + step.id + "_done").click(function() { causesOK(step.id); });
  },
  "addTests": function(step) {
    step.editingTests.forEach(function(test) { wireEditingTest(test, step); });
    $("#" + step.editingTests[0].id + "_input").focus();
  },
  "duckSuggestion": function(step) {},
  "testDone": function(step) {
    step.testsAvailable.forEach(function(id) {
      $("#" + step.id + "_" + id + "_done").click(function() { testDone(id, step); });
    });
    wireOutcomesHappened(step.test, step);
  },
  "duckConclusion": function(step) {
    $("#" + step.id + "_newproblem").click(newProblem);
  }
};

function wireEditingCause(cause, step) {
  $("#" + cause.id + "_input").keyup(function (e) {
    cause.text = $("#" + cause.id + "_input").val();
    if (cause.text != "" && cause.id == step.editingCauses[step.editingCauses.length - 1].id) {
      var newCause = { "id": problem.idCounter++, "text": "", "p": DEFAULT_LIKELIHOOD };
      step.editingCauses.push(newCause);
      $("#" + step.id + "_table").append(t("editingCause", newCause));
      wireEditingCause(newCause, step);
      save();
    }
    if (e.keyCode == 13) {
      if (cause.text == "") {
        causesOK(step.id);
      } else {
        if (!cause.pEdited) {
          $("#" + cause.id + "_p").focus();
        } else {
          $("#" + (cause.id + 1) + "_input").focus();
        }
      }
      save();
    }
  });
  
  $("#" + cause.id + "_p").change(function (e) {
    cause.p = $("#" + cause.id + "_p").val();
    cause.pEdited = true;
    save();
  });
  $("#" + cause.id + "_p").keyup(function (e) {
    if (e.keyCode == 13) {
      $("#" + (cause.id + 1) + "_input").focus();
      save();
    }
  });
}

function wireEditingTest(test, step) {
  $("#" + test.id + "_input").keyup(function (e) {
    test.text = $("#" + test.id + "_input").val();
    if (test.text != "" && test.outcomes.length == 0) {
      test.outcomes = [
        { "id": problem.idCounter++, "text": "", "eliminates": [] }
      ];
      
      $("#" + test.id + "_test").append(t("editingTest_outcomes", test, {
        "outcomes": t("editingOutcome", test.outcomes[0])
      }));
      
      wireEditingOutcome(test.outcomes[0], test, step);
      save();
    }
    if (e.keyCode == 13) {
      $("#" + test.id + "_cost").focus();
      save();
    }
  });
  
  $("#" + test.id + "_cost").change(function (e) {
    test.cost = $("#" + test.id + "_cost").val();
    test.costEdited = true;
    save();
  });
  $("#" + test.id + "_cost").keyup(function (e) {
    if (e.keyCode == 13) {
      $("#" + test.outcomes[0].id + "_input").focus();
      save();
    }
  });
  
  test.outcomes.forEach(function(outcome) {
    wireEditingOutcome(outcome, test, step);
  });
  
  wireEditingTestButtons(test, step);
}

function wireEditingOutcome(outcome, test, step) {
  $("#" + outcome.id + "_input").keyup(function (e) {
    outcome.text = $("#" + outcome.id + "_input").val();
    if (outcome.text != "" && !outcome.eliminatesShowing) {
      outcome.eliminatesShowing = true;
      
      $("#" + outcome.id).append(t("editingEliminatesSection", outcome, {
        "eliminations": problem.causes.map(function(cause) {
          return t("editingEliminates", cause, { "id": outcome.id + "_" + cause.id, "eliminated": false });
        }).join("\n")
      }));
      
      wireEditingEliminatesSection(outcome, test, step);
      
      var newOutcome = { "id": problem.idCounter++, "text": "", "eliminates": [] };
      test.outcomes.push(newOutcome);
      
      $("#" + outcome.id).after(t("editingOutcome", newOutcome));
      wireEditingOutcome(newOutcome, test, step);
      
      if (test.outcomes.length == 3 && !test.buttons) {
        test.buttons = true;
        $("#" + test.id + "_outcomes").after(t("editingTest_buttons", test));
        wireEditingTestButtons(test, step);
      }
      
      bottom();
      save();
    }
    if (e.keyCode == 13) {
      $("#" + (outcome.id + 1) + "_input").focus();
      save();
    }
  });
  
  if (outcome.text != "") {
    wireEditingEliminatesSection(outcome, test, step);
  }
}

function wireEditingEliminatesSection(outcome, test, step) {
  problem.causes.forEach(function(cause) {
    $("#" + outcome.id + "_" + cause.id).click(function() {
      if (outcome.eliminates.indexOf(cause.id) == -1) {
        outcome.eliminates.push(cause.id);
        $("#" + outcome.id + "_" + cause.id).addClass("eliminated");
      } else {
        outcome.eliminates.splice(outcome.eliminates.indexOf(cause.id), 1);
        $("#" + outcome.id + "_" + cause.id).removeClass("eliminated");
      }
      save();
    });
  });
}

function wireEditingTestButtons(test, step) {
  $("#" + test.id + "_done").click(function() {
    if (step.editingTests.indexOf(test) != step.editingTests.length - 1) { return; }
    testsOK(step.id);
  });
  $("#" + test.id + "_or").click(function() {
    if (step.editingTests.indexOf(test) != step.editingTests.length - 1) { return; }
    if (stepCtx(step.id).next) { return; }
    $("#" + test.id + "_done").addClass("notchosen");
    $("#" + test.id + "_or").addClass("chosen");
    var newTest = { "id": problem.idCounter++, "text": "", "cost": DEFAULT_COST, "outcomes": [] };
    step.editingTests.push(newTest);
    $("#" + step.id).append(t("editingTest", newTest));
    wireEditingTest(newTest, step);
    $("#" + newTest.id + "_input").focus();
    bottom();
    save();
  });
}

function wireOutcomesHappened(id, step) {
  g(step.test).outcomes.forEach(function(outcome) {
    $("#" + step.id + "_" + outcome.id + "_happened").click(function() {
      outcomeHappened(outcome, g(id), step);
    });
  });
}

function stepHtml(step, prev, next) {
  return stepRenderers[step.type](step, prev, next);
}

var stepRenderers = {
  "addProblem": function(step, prev, next) {
    return t("addProblem", step, { "text": problem.text, "next": next });
  },
  "addCauses": function(step, prev, next) {
    return t("addCauses", step, {
      "next": next,
      "causes":
        next
        ? step.causes.map(function(id) {
          return t("cause", g(id));
        }).join("\n")
        : step.editingCauses.map(function(cause) {
          return t("editingCause", cause);
        }).join("\n")
    });
  },
  "addTests": function(step, prev, next) {
    if (next) {
      return t("addTests", step, {
        "tests": step.tests.map(function(id) {
          var test = g(id);
          return t("test", test, {
            "another": step.tests.indexOf(id) < step.tests.length - 1,
            "done": step.tests.indexOf(id) == step.tests.length - 1,
            "outcomes": test.outcomes.map(function(outcome) {
              return t("outcome", outcome, {
                "eliminations": problem.causes.map(function(cause) {
                  return t("eliminates", cause, { "id": outcome.id + "_" + cause.id, "eliminated": outcome.eliminates.indexOf(cause.id) != -1 });
                }).join("\n")
              });
            }).join("\n")
          });
        }).join("\n")
      });
    } else {
      return t("addTests", step, {
        "tests": step.editingTests.map(function(test) {
          var html = t("editingTest", test);
          if (test.outcomes.length > 0) {
            html += t("editingTest_outcomes", test, {
              "outcomes": test.outcomes.map(function(outcome) {
                var eliminatesSection = "";
                if (outcome.text.length > 0) {
                  eliminatesSection = t("editingEliminatesSection", outcome, {
                    "eliminations": problem.causes.map(function(cause) {
                      return t("editingEliminates", cause, { "id": outcome.id + "_" + cause.id, "eliminated": outcome.eliminates.indexOf(cause.id) != -1 });
                    }).join("\n")
                  });
                }
                return t("editingOutcome", outcome, { "eliminatesSection": eliminatesSection });
              }).join("\n")
            });
            
            if (test.outcomes.length > 1 || test.outcomes[0].text != "") {
              html += t("editingTest_buttons", test, {
                "another": step.editingTests.indexOf(test) < step.editingTests.length - 1,
                "done": false
              });
            }
          }
          
          return html;
        }).join("\n")
      });
    }
  },
  "duckSuggestion": function(step) {
    return t("duckSuggestion", step, { "test": g(step.test) });
  },
  "testDone": function(step) {
    return t("testDone", step, {
      "tests": step.testsAvailable.map(function(id) {
        return t("doneTest", g(id), { "id": step.id + "_" + id, "chosen": step.test == id, "notchosen": step.test != -1 });
      }).join("\n"),
      "hasOutcome": step.test != -1,
      "outcomes": step.test == -1 ? null : g(step.test).outcomes.map(function(outcome) {
        return t("outcomeHappened", outcome, { "id": step.id + "_" + outcome.id, "chosen": step.outcome == outcome.id, "notchosen": step.outcome != -1 });
      }).join("\n")
    });
  },
  "duckConclusion": function(step) {
    return t("duckConclusion", step, { "cause": g(step.cause) });
  }
};

function startDuck() {
  restartDuck();
}

function restartDuck() {
  $("#content").html("");
  for (var i = 0; i < problem.steps.length; i++) {
    $("#content").append(stepHtml(
      problem.steps[i],
      i == 0 ? null : problem.steps[i - 1],
      i == problem.steps.length - 1 ? null : problem.steps[i + 1]));
    wireStep(problem.steps[i]);
  }
  
  updateMenu();
}

function updateMenu() {
  $("#menuContents").html(t("menu", data, {
    "problems": data.problems.map(function(p) {
      return t("menuProblem", p, { "id": data.problems.indexOf(p), "selected": problem == p });
    }).join("\n")
  }));
  
  data.problems.forEach(function(p) {
    $("#problem_" + data.problems.indexOf(p)).click(function() { switchToProblem(data.problems.indexOf(p)); });
  });
}

function switchToProblem(id) {
  data.currentProblem = id;
  problem = data.problems[data.currentProblem];
  restartDuck();
  save();
}

function newProblem() {
  data.problems.push({
    "idCounter": 1,
    "text": "",
    "causes": [],
    "tests": [],
    "steps": [
      {
        "id": 0,
        "type": "addProblem"
      }
    ]
  });
  data.currentProblem = data.problems.length - 1;
  problem = data.problems[data.currentProblem];
  restartDuck();
  save();
}