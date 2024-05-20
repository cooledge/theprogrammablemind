const { Config, knowledgeModule, where } = require('./runtime').theprogrammablemind
const gdefaults = require('./gdefaults')
const punctuation_tests = require('./punctuation.test.json')

let configStruct = {
  name: 'punctuation',
  operators: [
    "([leftParenthesis|] (phrase) ([rightParenthesis|]))",
    "((before) [comma|])", // comma applies if before is dead
    "([colon|])",
  ],
  bridges: [
    {
      id: "comma",
      level: 0,
      bridge: "{ ...before[0], decorators.after: operator }",      // css :after decoration
      words: [{ word: ",", value: ',', depth: '+' }],
    },
    {
      id: "leftParenthesis",
      level: 0,
      bridge: "{ ...after[0], parenthesis: '(' }",
      words: [{ word: "(", value: '(', depth: '+' }],
    },
    {
      id: "rightParenthesis",
      level: 0,
      bridge: "{ ...next(operator) }",
      words: [{ word: ")", value: ')', depth: '-' }],
    },
    { id: "colon", words: [':'],  },
  ],

  generators: [
    { 
      where: where(),
      priority: -1,
      match: ({context}) => context.parenthesis == '(',
      apply: ({context, g}) => `(${g({ ...context, parenthesis: null })})` 
    },
  ],
};

const createConfig = () => new Config(configStruct, module).add(gdefaults())

knowledgeModule( {
  module,
  createConfig,
  description: 'punctuation',
  test: {
    name: './punctuation.test.json',
    contents: punctuation_tests,
    checks: {
            context: [
              'marker',
              'text',
              { 'value': ['marker', 'text', 'value'] },
            ],
          },
  },
})

