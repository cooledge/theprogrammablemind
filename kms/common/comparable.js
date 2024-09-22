const { Config, knowledgeModule, where, Digraph } = require('./runtime').theprogrammablemind
const { defaultContextCheck } = require('./helpers')
const dialogues = require("./dialogues")
const numbers = require("./numbers")
const comparable_tests = require('./comparable.test.json')

let config = {
  name: 'comparable',
  operators: [
    "([condition|])",
    "(([condition/1]) <compare|> ([comparable]))",
    "([highest])",
    "([lowest])",
  ],
  bridges: [
    { 
      id: "compare", 
      level: 0, 
      convolution: true, 
      before: ['verby', 'articlePOS'],
      // bridge: "{ ...after, comparison: append(before[0], after[0].comparison), modifiers: append([before[0].marker], after[0].modifiers), [before[0].marker]: before[0] }" 
      // bridge: "{ ...after, comparison: append([], before[0].marker, after[0].comparison) }" 
      bridge: "{ ...next(before[0]), property: after, postModifiers: append([after[0].marker], before[0].modifiers), [after[0].marker.id]: after[0] }" 
      // bridge: "{ ...next(operator), property: after, postModifiers: append([after[0].marker], before[0].modifiers), [after[0].marker.id]: after[0] }" 
    },
    { 
      id: "condition", 
      children: ['highest', 'lowest'],
      level: 0, 
      bridge: "{ ...next(operator) }" 
    },
    { 
      id: "comparable", 
      level: 0, 
      bridge: "{ ...next(operator) }" 
    },
    { 
      id: "lowest", 
      level: 0, 
      bridge: "{ ...next(operator) }" 
    },
    { 
      id: "highest", 
      level: 0, 
      bridge: "{ ...next(operator) }" 
    },
  ],
};

knowledgeModule({ 
  config,
  includes: [dialogues, numbers],

  module,
  description: 'Comparable things',
  test: {
    name: './comparable.test.json',
    contents: comparable_tests,
    checks: {
            context: defaultContextCheck,
          },
  },
})
