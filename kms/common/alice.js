const { Config, knowledgeModule, ensureTestFile, where } = require('./runtime').theprogrammablemind
ensureTestFile(module, 'alice', 'test')
ensureTestFile(module, 'alice', 'instance')

const kid = require('./kid')
const alice_tests = require('./alice.test.json')
const alice_instance = require('./alice.instance.json')

const template = {
  "queries": [
    "you are alice",
  ]
};

const createConfig = () => {
  const config = new Config({ name: 'alice', }, module)
  config.add(kid())
  return config
}

const config = createConfig()

// config.load(template, alice_instance)
knowledgeModule( {
  module,
  description: 'Kia Simulator using a KM template',
  config,
  test: {
          name: './alice.test.json',
          contents: alice_tests,
          checks: {
            context: [
              'marker',
              'text',
              { valueLists: { value: ['marker', 'text', 'value'] } },
            ],
          },
        },
  template: {
    template,
    instance: alice_instance,
  },
})
