const { Config, knowledgeModule, where, Digraph } = require('./runtime').theprogrammablemind
const dimension = require('./dimension.js')
const weight_tests = require('./weight.test.json')
const weight_instance = require('./weight.instance.json')

/*
  x y and z are english/metric units
  use english units
  ...
  troy and english ounces and pounds
  troy ounces english ounces and pounds
  troy and english ounces and ounces
  troy ounces and ounces

  troy ounce is an ounce
*/
const template = {
  "queries": [
    "troy modifies ounces",
    "weight is a dimension",
    // "kilograms grams pounds ounces and tons are units of weight",
    "kilograms grams pounds (troy ounces) ounces and tons are units of weight",
    "ounces = 1.097 * troy ounces",
    "troy ounces = ounces / 1.097",
    "kilograms = pounds * 0.453592",
    "grams = kilograms * 1000",
    "kilograms = grams / 1000",
    "pounds = kilograms * 2.20462",
    "ounces = pounds * 16",
    "ton = tonne * 0.907185",
    "pounds = ton * 2000",
    // "the weight of greg is 213 pounds",
  ],
}

const createConfig = () => {
  const config = new Config({ name: 'weight' }, module)
  config.add(dimension())
  return config
}

knowledgeModule({ 
  module,
  description: 'Weight dimension',
  createConfig,
  test: {
    name: './weight.test.json',
    contents: weight_tests
  },
  template: {
    template,
    instance: weight_instance
  }
})
