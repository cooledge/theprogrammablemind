const { Config, knowledgeModule, where } = require('./runtime').theprogrammablemind
const { defaultContextCheck } = require('./helpers')
const createCharacters = require('./characters')
const stgame_tests = require('./stgame.test.json')
const createKirk = require('./kirk')
const createSpock = require('./spock')

class API {
  response({context, result}) {
    console.log('----------------------------------------')
    console.log(`${context.value} says: `, result.paraphrases)
    console.log('----------------------------------------')
  }

  initialize() {
  }
}
const api = new API()

class KirkAPI {
  initialize() {
  }

  constructor(kirk) {
    this.kirk = kirk
  }

  getName() {
    return "kirk"
  }

  process(config, utterance) {
    this.kirk.server(config.getServer(), config.getAPIKey())
    return this.kirk.process(utterance, { credentials: this.credentials })
  }
  
  response({km, context, result}) {
    km('stgame').api.response({context, result})
  }
}

class SpockAPI {
  initialize() {
  }

  constructor(spock) {
    this.spock = spock
  }

  getName() {
    return "spock"
  }

  process(config, utterance) {
    this.spock.server(config.getServer(), config.getAPIKey())
    return this.spock.process(utterance, { credentials: this.credentials })
  }
  
  response({km, context, result}) {
    km('stgame').api.response({context, result})
  }
}


const createConfig = async () => {
  const config = new Config({ 
      name: 'stgame', 
      operators: [ "([a])" ],
      bridges: [ { id: 'a', level: 0, bridge: "{ ...next(operator) }" } ],
      words: {"?": [{"id": "a", "initial": "{}" }]},
  }, module)

  const createCharactersHelper = async () => {
    const characters = await createCharacters()
    const kirk = await createKirk()
    const spock = await createSpock()
    await characters.setApi(new KirkAPI(kirk))
    await characters.setApi(new SpockAPI(spock))
    return characters
  }
  config.stop_auto_rebuild()
  await config.setApi(api)
  await config.add(createCharactersHelper)
  await config.restart_auto_rebuild()
  return config
}

knowledgeModule( {
  module,
  description: 'Game simulator for trek-like characters',
  createConfig,
  test: {
          name: './stgame.test.json',
          contents: stgame_tests,
          checks: {
            context: defaultContextCheck,
          },
        },
})
