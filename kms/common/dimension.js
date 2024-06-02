const { Config, knowledgeModule, where, Digraph } = require('./runtime').theprogrammablemind
const { defaultContextCheck } = require('./helpers')
const base = require('./dimensionTemplate.js')
const formulas = require('./formulas.js')
const testing = require('./testing.js')
const dimension_tests = require('./dimension.test.json')

/*
  x celcius equals x*9/5 + 32 fahrenheit
  x fahrenheit equals (x-32)*5/9 + 32 fahrenheit
  10 celcius + 5

  10 C

  use a digraph for calculating convertions

  can you convert between all units of length
  configure the conversions for length
  "square kilometers" is a phrase
  for weight what can you convert between
  what can you convert between for weight
  what is the conversion between pounds and kilograms
*/
class API {

  initialize({ config }) {
    this._config = config
  }

  setup( {dimension, units} ) {
    const config = this._config

    // for example, setup temperature concept
    config.addOperator(`([${dimension}])`)
    config.addBridge({ 
      id: dimension,
      isA: ['dimension'],
      generatorp: ({context, g}) => context.amount ? `${g(context.amount)} ${g(context.unit)}` : context.word,
    })

    // for example, celcius and fahrenheit
    for (let unit of units) {
      config.addOperator(`([${unit}])`)
      config.addBridge({ 
        id: unit,
        isA: ['unit'],
      })
    }
  }
}

const api = new API()

let configStruct = {
  name: 'dimension',
  operators: [
    "([dimension])",
    "([unit])",
    // "(([unit]) [kindOfDimension|of] ([dimension]))",
    "((amount/1 || number/1) [amountOfDimension|] ([unit]))",
    "(([amount]) [unit])",
    "((dimension/1) [convertToUnits|in] (unit/1))",

    "(([number]) [degree])",
    { pattern: "([length])", development: true },
  ],
  priorities: [
    // TODO this should have been calculated
    { "context": [['amountOfDimension', 0], ['convertToUnits', 0], ], "choose": [0] },
  ],
  hierarchy: [
    { child: 'convertToUnits', parent: 'testingValue', development: true },
  ],
  generators: [
    {
      where: where(),
      match: ({context}) => context.marker == 'noconversion',
      apply: ({context, gp}) => `there is no conversion between ${gp(context.from)} and ${gp(context.to)}`,
    },
  ],
  bridges: [
    { 
      where: where(),
      id: "dimension", 
      isA: [],
      generatorpr: {
        match: ({context}) => context.amount,
        apply: ({context, g, gp}) => `${g(context.amount)} ${gp(context.unit)}`,
      },
    },
    { id: "length", isA: ['dimension'], development: true },
    { id: "amount", },
    /*
    { 
      id: "kindOfDimension", 
      bridge: "{ ...next(operator), subclass: before[0], class: after[0], value: concat(before[0].marker.id, after[0].marker.id) }",
      // bridge: "{ ...next(operator), subclass: before[0], class: after[0], value: concat(before[0].marker, after[0].marker) }",
      isA: ['preposition'],
      generatorp: ({context, gp}) => `${gp(context.subclass)} ${context.word} ${gp(context.class)}`,
    },
    */
    { 
      where: where(),
      id: "degree", 
      words: [{ word: 'degrees', number: 'many' }],
      isA: ['amount'],
      generatorp: ({context, g}) => (context.amount) ? `${g(context.amount)} ${context.word}` : context.word,
      bridge: "{ ...next(operator), value: before[0].value, amount: before[0] }",
    },
    { 
      id: "amountOfDimension", 
      convolution: true, 
      bridge: "{ marker: operator('dimension'), unit: after[0], value: before[0].value, amount: before[0] }" 
    },
    { 
      where: where(),
      id: "convertToUnits", 
      bridge: "{ ...next(operator), from: before[0], to: after[0] }",
      isA: ['expression', 'queryable'],
      after: [['possession', 0], ['possession', 1]],
      generatorp: ({context, g}) => `${g(context.from)} ${context.word} ${g(context.to)}`,
      // evaluator: ({context, kms, error}) => {
      evaluator: ({context, kms, e, error}) => {
        /*
        error(({context, e}) => {
          context.evalue = 'dont know...'
        })
        */
        const from = context.from;
        const to = context.to;
        let evalue;
        let efrom = from
        if (!from.unit) {
          efrom = e(from).evalue
        }
        if (to.value == efrom.unit.value) {
          evalue = efrom
        } else {
          const formula = kms.formulas.api.get(to, [efrom.unit])
          if (!formula) {
            const reason = { marker: 'reason', focusableForPhrase: true, evalue: { marker: 'noconversion', from: efrom.unit, to } }
            kms.stm.api.mentioned(reason)
            error(reason)
          }
          kms.stm.api.setVariable(efrom.unit.value, efrom.amount)
          evalue = e(formula)
        }
        /*
        '{
            "marker":"dimension",
            "unit":{"marker":"unit","range":{"start":19,"end":25},"word":"celcius","text":"celcius","value":"celcius","unknown":true,"types":["unit","unknown"]},
            "value":10,
            "amount":{"word":"degrees","number":"many","text":"10 degrees","marker":"degree","range":{"start":8,"end":17},"value":10,"amount":{"value":10,"text":"10","marker":"number","word":"10","range":{"start":8,"end":9},"types":["number"]}},
              "text":"10 degrees celcius","range":{"start":8,"end":25}}'
        */
        context.evalue = { 
          paraphrase: true,
          marker: 'dimension',
          level: 1,
          unit: to,
          amount: { evalue, paraphrase: undefined }
        }
      },
    },
    { id: "unit", },
  ]
};

const createConfig = () => {
  const config = new Config(configStruct, module)
  config.add(base()).add(formulas()).add(testing())
  config.api = api
  return config
}

knowledgeModule({ 
  module,
  description: 'Used to define numeric temperature such as currency, temperature or weight',
  createConfig,
  test: {
    name: './dimension.test.json',
    contents: dimension_tests,
    checks: {
      objects: [{ km: 'properties' }],
      checks: {
            context: defaultContextCheck,
          },

    }
  },
})
