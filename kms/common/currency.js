const { Config, knowledgeModule, where, Digraph } = require('./runtime').theprogrammablemind
const { defaultContextCheck } = require('./helpers')
const numbersKM = require('./numbers.js')
const currency_tests = require('./currency.test.json')

class API {

  initialize() {
  }

  // map currency word to the unit that will be put in the context
  getUnits() {
    return {
      'dollars': 'dollar', 
      'dollar': 'dollar',
      'pounds': 'pound',
      'pound': 'pound',
      'euros': 'euro', 
      'euro': 'euro',
    } 
  }

  getUnitWords() {
    return [
      { units: 'dollar', one: 'dollar', many: 'dollars' },
      { units: 'pound', one: 'pound', many: 'pounds' },
      { units: 'euro', one: 'euro', many: 'euros' },
    ]
  }

  convertTo(amount, fromUnits, toUnits) {
    const conversion = {
    "dollar": { "euro": 0.82, "pound": 0.71, },
    "euro": { "dollar": 1.22, "pound": 0.82, },
    "pound": { "dollar": 1.42, "euro": 1.16, },
    }
    return conversion[fromUnits][toUnits] * amount
  }
}

const api = new API()

let configStruct = {
  name: 'currency',
  operators: [
    "(([number]) [currency])",
    "((currency/1) [in] (currency/0))",
    // TODO 20 dollars in euros and yen
  ],
  bridges: [
    { "id": "currency", "level": 0, "bridge": "{ ...next(operator), amount: before[0] }" },
    // { "id": "currency", "level": 1, "bridge": "{ ...next(operator) }" },
    { "id": "in", "level": 0, "bridge": "{ ...next(operator), from: before[0], to: after[0] }" },
  ],
  floaters: ['isQuery'],
  debug: true,
  "version": '3',

  generators: [
    { 
      where: where(),
      match: ({context}) => context.marker == 'currency' && !context.isAbstract, 
      apply: ({context, g}) => {
        word = Object.assign({}, context.amount)
        word.isAbstract = true
        word.marker = 'currency'
        word.units = context.units
        word.value = context.amount.value
        // generator = [({context}) => context.marker == 'currency' && context.units == words.units && context.value > 1 && context.isAbstract, ({context, g}) => words.many ]
        return `${g(context.amount.value)} ${g(word)}`
      } 
    },
  ],

  semantics: [
    {
      match: ({objects, context}) => context.marker == 'in',
      where: where(),
      apply: ({objects, api, context}) => {
        const from = context.from
        const to = context.to
        const value = api.convertTo(from.amount.value, from.units, to.units)
        context.marker = 'currency'
        context.isAbstract = false
        context.amount = { value }
        context.units = to.units
        context.isResponse = true
      }
    }
  ],
};

const createConfig = async () => {
  const config = new Config(configStruct, module)
  config.stop_auto_rebuild()
  await config.add(numbersKM)
  config.api = api
  config.initializer( ({config, objects, apis, addWord, addGenerator, baseConfig, uuid}) => {
    // const api = config.km('currency').api
    // const api = kms.currency.api
    const api = apis('currency')
    units = api.getUnits()
    for (word in units) {
      def = {"id": "currency", "initial": { units: units[word] }, uuid}
      addWord(word, def)
    }
    /*
    for (word in units) {
      words = config.get('words')
      def = {"id": "currency", "initial": { units: units[word] }, uuid}
      if (words[word]) {
        words[word].push(def)
      } else {
        words[word] = [def]
      }
    }
    */

    unitWords = api.getUnitWords();
    for (let words of unitWords) {
        addGenerator({
          match: ({context}) => context.marker == 'currency' && context.units == words.units && context.value == 1 && context.isAbstract, 
          apply: ({context, g}) => words.one, uuid
        });
        addGenerator({
          match: ({context}) => context.marker == 'currency' && context.units == words.units && !isNaN(context.value) && (context.value != 1) && context.isAbstract, 
          apply: ({context, g}) => words.many, uuid
        })
    }
  })
  await config.restart_auto_rebuild()
  return config
}

knowledgeModule({ 
  module,
  description: 'Ways of specifying currency amount',
  createConfig,
  test: {
    name: './currency.test.json',
    contents: currency_tests,
    checks: {
            context: defaultContextCheck,
          },

  },
})
