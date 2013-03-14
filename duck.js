var data = es; // Set data to example state.
var problem = data.problems[0];

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
  }}

function stepHtml(step, prev, next) {
  return stepRenderers[step.type](step, prev, next);
}

function t(name, obj, kv) {
  var template = Handlebars.compile($("#t_" + name).html());
  var ctx = {};
  if (obj) { for (x in obj) { ctx[x] = obj[x]; } }
  if (kv ) { for (x in kv ) { ctx[x] = kv [x]; } }
  return template(ctx);
}

var stepRenderers = {
  "addProblem": function(step, prev, next) {
    return t("addProblem", step, { "next": next });
  },
  "addCauses": function(step, prev, next) {
    return t("addCauses", step, {
      "next": next,
      "causes": step.causes.map(function(id) {
        return t("cause", g(id));
      }).join("\n")
    });
  },
  "addTests": function(step, prev, next) {
    return t("addTests", step, {
      "tests": step.tests.map(function(id) {
        var test = g(id);
        return t("test", test, {
          "another": step.tests.indexOf(id) < step.tests.length - 1,
          "done": step.tests.indexOf(id) == step.tests.length - 1 &&next,
          "outcomes": test.outcomes.map(function(outcome) {
            return t("outcome", outcome, {
              "eliminations": problem.causes.map(function(cause) {
                return t("eliminates", cause, { "eliminated": outcome.eliminates.indexOf(cause.id) != -1 });
              }).join("\n")
            });
          }).join("\n")
        });
      }).join("\n")
    });
  },
  "duckSuggestion": function(step) {
    return t("duckSuggestion", step, { "test": g(step.test) });
  },
  "testDone": function(step) {
    return t("testDone", step, {
      "tests": step.testsAvailable.map(function(id) {
        return t("doneTest", g(id), { "chosen": step.test == id, "notchosen": step.test != -1 });
      }).join("\n"),
      "hasOutcome": step.test != -1,
      "outcomes": step.test == -1 ? null : g(step.test).outcomes.map(function(outcome) {
        return t("outcomeHappened", outcome, { "chosen": step.outcome == outcome.id, "notchosen": step.outcome != -1 });
      }).join("\n")
    });
  },
  "duckConclusion": function(step) {
    return t("duckConclusion", step, { "cause": g(step.cause) });
  }
};

function startDuck() {
  for (var i = 0; i < problem.steps.length; i++) {
    $("#content").append(stepHtml(
      problem.steps[i],
      i == 0 ? null : problem.steps[i - 1],
      i == problem.steps.length - 1 ? null : problem.steps[i + 1]));
  }
}