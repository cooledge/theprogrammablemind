const { Config, knowledgeModule, ensureTestFile, where } = require('./runtime').theprogrammablemind
const { defaultContextCheck, propertyToArray } = require('./helpers')
const edible = require('./edible')
const events = require('./events')
const sizeable = require('./sizeable')
const countable = require('./countable')
ensureTestFile(module, 'fastfood', 'test')
ensureTestFile(module, 'fastfood', 'instance')

const fastfood_tests = require('./fastfood.test.json')
const fastfood_instance = require('./fastfood.instance.json')

/*
  hello -> to order
  can I help you? -> expect order
    a big mac and large fries with a large coke
  gimme a big mac and large fries with a large coke
  make them large
  no small instead
  give me a combo one / give me a single combo / i want combo one
  i want 2 hamburgers -> what kind?
    big mac
    big mac quarter pounder

  single and double combo
  single combo
  combo one and two

  double hamburger
  number 1 and 2
  number 1 2 and 3
*/

const template ={
  "queries": [
    "food is countable",
    "drinks are countable",
    "bacon modifies deluxe",
    { priorities: [ { "context": [['bacon_deluxe', 0], ['list', 0]], "choose": [0] } ] },
    "chicken modifies sandwich",
    { priorities: [ { "context": [['chicken_sandwich', 0], ['list', 0]], "choose": [0] } ] },
    "premium modifies cod",
    { priorities: [ { "context": [['premium_cod', 0], ['list', 0]], "choose": [0] } ] },
    "ultimate chicken modifies grill",
    { priorities: [ { "context": [['ultimate_chicken_grill', 0], ['list', 0]], "choose": [0] } ] },
    // "10 piece modifies nuggets",
    "asiago ranch chicken modifies club",
    { priorities: [ { "context": [['asiago_ranch_chicken_club', 0], ['list', 0]], "choose": [0] } ] },
    "waffle modifies fries",
    { priorities: [ { "context": [['waffle_fry', 0], ['list', 0]], "choose": [0] } ] },
    "waffle fries are french fries",
    "mango modifies passion",
    "wild modifies berry",
    "strawberry modifies banana",
    "strawberry guava mango passion wild berry and strawberry banana modify smoothie",
    "strawberry guava mango passion wild berry and strawberry banana are countable",
    "smoothie modifies ingredients",
    "strawberry guava mango passion wild berry and strawberry banana are smoothie ingredients",
    "a smoothie is a drink",
    "french fries and waffle fries are fries",
    "single double triple baconator and bacon deluxe are hamburgers",
    // "spicy homestyle asiago ranch chicken club 10 piece nuggets ultimate chicken grill and premium cod are sandwiches",
    "spicy homestyle asiago ranch chicken club ultimate chicken grill and premium cod are sandwiches",
    "a meals is food",
    "a combo is a meal",
    "single double triple baconator bacon deluxe spicy homestyle and premium cod are meals",
    {
      where: where(),
      operators: [
        "((meal/* && context.comboNumber == undefined) [comboMeal] (combo/*))",
        "((combo/*) [comboNumber] (number/* || numberNumberCombo/*))",
        "((numberNumberCombo/1) [numberNumberCombo_combo|] (combo/0))",
        "((number/0,1 && context.instance == undefined) [numberNumberCombo] (number/0,1))",
        "((combo/*) [([withModification|with] ([modification]))])",
      ],
      floaters: ['instance'],
      priorities: [
       { "context": [['number', 0], ['numberNumberCombo', 0], ], "choose": [0] },
       { "context": [['list', 0], ['numberNumberCombo', 0], ], "choose": [0] },

       // TODO take this out make the server side learn if from "(combo one) and (two combo twos)" .   (prioritized1) 'and' (prioritized2) where 1+2 came from and build the cp that way
       { "context": [['combo',0], ['number', 0], ['list', 0], ['number', 0],['combo', 0],['number',0]], ordered: true, choose: [0,1,3,4,5] },
       { "context": [['number',0], ['smoothie_ingredient', 0], ['list', 0], ['number', 0],['smoothie_ingredient', 0],['smoothie',0]], ordered: true, choose: [0,1,3,4] },

       { "context": [['smoothie_ingredient', 1], ['list', 0], ['number', 1], ['smoothie_ingredient', 1], ['smoothie', 1]], ordered: true, choose: [2,3] },
       { "context": [['smoothie_ingredient', 1], ['list', 0], ['smoothie_ingredient', 1], ['smoothie', 1]], ordered: true, choose: [1] },

       { "context": [['list', 0], ['number', 1], ['combo', 1], ['number', 1]], ordered: true, choose: [2,3] },
       { "context": [['withModification', 0], ['modification', 1], ['list', 0], ['modification', 1]], ordered: true, choose: [2] },
      /*

        { "context": [['number', 0], ['numberNumberCombo', 0], ], "choose": [0] },
        { "context": [['list', 0], ['numberNumberCombo', 0], ], "choose": [0] },
        // [['list', 0], ['comboNumber', 0], ],
        // [['comboNumber', 0], ['list', 0]],
        // this is just to learn associations and contextual_priorities I don't want the semantic to actually run
        // TODO make this learn cp#2 { query: "combo one and (2 combo twos)", skipSemantics: true },
        // TODO make this learn cp#1 { query: "(single and double) combo", skipSemantics: true },
        // cp#1
        { context: [['meal', 0], ['list',0], ['meal', 0], ['combo', 0]], ordered: true, choose: [0,1,2] },
        // cp#2
        // have a way of specifing this
        // { context: [['list',0], ['number', 0], ['combo', 0], ['number', 0]], ordered: true, choose: [comboNumber (in between 2 and 3)] },
        { context: [['list',0], ['number', 0], ['combo', 0], ['number', 0]], ordered: true, choose: [2,3] },
        { context: [['list',0], ['number', 1], ['combo', 0], ['number', 0]], ordered: true, choose: [2,3] },
        { context: [['list',0], ['number', 1], ['combo', 0], ['number', 1]], ordered: true, choose: [2,3] },
        {"context":[["mango_passion_smoothie",1],["list",0],["strawberry",1],['smoothie',1]],"ordered":true,"choose":[2,3]},
        {"context":[["list",0],["number",0],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[1,2]},
        {"context":[["list",0],["number",1],["strawberry",1],['smoothie',0]],"ordered":true,"choose":[1,2]},
        {"context":[["list",0],["number",1],["strawberry",1],['smoothie',1]],"ordered":true,"choose":[1,2]},

        // {"context":[["list",0],["number",1],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[1,2]},
        // {"context":[["list",0],["number",1],["strawberry",0],['smoothie',1]],"ordered":true,"choose":[1,2]},

        // 2 strawberry and 3 mange smoothies
        // 2 strawberry smoothies and 3 mango smoothies
        {"context":[['mango_passion_smoothie', 1],["list",0],["number",1],["strawberry",1],['smoothie',1]],"ordered":true,"choose":[3,4]},
        {"context":[['smoothie', 0],["list",0],["number",1],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[3,4]},
        {"context":[['smoothie', 1],["list",0],["number",1],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[3,4]},
        {"context":[["list",0],["number",1],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[1,2]},
        {"context":[["list",0],["number",1],["strawberry",0],['smoothie',1]],"ordered":true,"choose":[1,2]},

        {"context":[["mango_passion", 1],["list",0],["number",0],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[0,2,3]},
        {"context":[["mango_passion", 1],["list",0],["number",1],["strawberry",0],['smoothie',0]],"ordered":true,"choose":[0,2,3]},
        {"context":[["mango_passion", 1],["list",0],["number",1],["strawberry",1],['smoothie',0]],"ordered":true,"choose":[0,2,3]},
      */
      ],
      generators: [
        {
          where: where(),
          match: ({context}) => false && context.marker == 'combo' && context.comboNumber,
          apply: ({context, g}) => g(context.comboNumber),
        }
      ],
      bridges: [
        { id: 'modification' },
        { 
          id: 'withModification',
          level: 0,
          isA: ['preposition'],
          generatorp: ({context, gp}) => `with ${gp(context.modifications)}`,
          bridge: "{ ...next(operator), modifications: after[0], flatten: false }",
        },
        { 
          id: 'withModification',
          level: 1,
          isA: ['preposition'],
          bridge: "{ ...next(before[0]), postModifiers: append(before[0].postModifiers, ['modifications']), modifications: operator }",
        },
        { 
          id: 'numberNumberCombo_combo',
          convolution: true,
          isA: ['food'],
          before: ['combo', 'counting'],
          bridge: "{ ...next(operator), modifiers: append(before[0].modifiers, ['comboNumber']), comboNumber: before[0], word: 'combo', flatten: true }",
        },
        { 
          id: 'comboMeal',
          convolution: true,
          before: ['meal', 'combo', 'counting'],
          bridge: "{ ...next(after[0]), modifiers: append(before[0].modifiers, ['type']), type: before[0], flatten: true }",
        },
        { 
          id: 'comboNumber',
          convolution: true,
          before: ['combo'],
          bridge: "{ ...next(before[0]), postModifiers: append(before[0].postModifiers, ['comboNumber']), comboNumber: after[0], instance: true, flatten: true }",
        },
        { 
          id: 'numberNumberCombo',
          convolution: true,
          isA: ['food'],
          before: ['combo', 'comboNumber'],
          bridge: "{ ...next(operator), word: 'number', combo: true, postModifiers: append(before[0].postModifiers, ['comboNumber']), comboNumber: after[0], flatten: true }",
        },
      ]
    },
    "fries and smoothies are modifications",
    "fries and smoothies are sizeable",
    // TODO Future see above note { query: "(combo one) and (2 combo twos)", skipSemantics: true },
    // { query: "(2 mango passion and (3 strawberry)) smoothies", skipSemantics: true },
  ],
}

class API {
  initialize({ objects, config }) {
    this._objects = objects
    this._objects.items = []
    this._objects.notAvailable = []
  }

  show() {
    this._objects.show = this._objects.items
  }

  add({ name, combo, modifications, size }) {
    this._objects.items.push({ name, combo, modifications, size })
  }

  say(response) {
    this._objects.response = response
  }

  // return true if you want the NLI layer to handle this
  hasAskedForButNotAvailable(item) {
    return this._objects.notAvailable.length > 0
  }

  getAskedForButNotAvailable(item) {
    const na = this._objects.notAvailable
    this._objects.notAvailable = []
    return na
  }

  addAskedForButNotAvailable(item) {
    this._objects.notAvailable.push(item)
  }

  isAvailable(id) {
    return [
      "double",
      "french_fry",
      "single",
      "triple",
      'baconator',
      'bacon_deluxe',
      'spicy',
      'homestyle',
      'asiago_range_chicken_club',
      'ultimate_chicken_grill',
      '10_peice_nuggets',
      'premium_cod',
      "waffle_fry",
      "strawberry_smoothie",
      "guava_smoothie",
      "mango_passion_smoothie",
      "wild_berry_smoothie",
      "strawberry_banana_smoothie",
    ].includes(id)
  }

  getCombo(number) {
    const map = {
      1: 'single',
      2: 'double',
      3: 'triple',
      4: 'baconator',
      5: 'bacon_deluxe',
      6: 'spicy',
      7: 'homestyle',
      8: 'asiago_range_chicken_club',
      9: 'ultimate_chicken_grill',
      10: '10_peice_nuggets',
      11: 'premium_cod',
    }
    return map[number]
  }
}

const api = new API()

class State {
  constructor(api) {
    this.api = api
  }

  add(food) {
    let quantity = 1
    if (food.quantity) {
      quantity = food.quantity.value
    }
    let name, combo
    if (food.comboNumber?.marker == 'numberNumberCombo') {
      name = this.api.getCombo(food.comboNumber.comboNumber.value)
      if (!name) {
        this.api.addAskedForButNotAvailable(food)
        return
      }
      combo = true
    }
    else if (food.comboNumber) {
      name = this.api.getCombo(food.comboNumber.value)
      if (!name) {
        this.api.addAskedForButNotAvailable(food)
        return
      }
      combo = true
    } else if (food.marker == 'combo') {
      name = food.type.value
      combo = true
    } else {
      name = food.value
      combo = !!food.combo
    }

    if (!this.api.isAvailable(name)) {
      this.api.addAskedForButNotAvailable(food)
      return
    }

    const addSize = (item, data) => {
      if (item.size) {
        data.size = item.size.value
      }
      return data
    }

    let modifications
    if (food.modifications) {
      modifications = []
      for (const modification of propertyToArray(food.modifications.modifications)) {
        modifications.push(addSize(modification, { id: modification.value }))
      }
    }

    for (let i = 0; i < quantity; ++i) {
      this.api.add(addSize(food, { name, combo, modifications }))
    }
  }

  // user ask what the order was
  show() {
    this.api.show()
  }

  say(response) {
    this.api.say(response)
  }
}

const createConfig = () => {
  const config = new Config({ 
    name: 'fastfood',
    operators: [
      "([orderNoun|order])",
      "([showOrder|show] ([orderNoun/1]))",
    ],
    // flatten: ['list'],
    // TODO use node naming not python
    priorities: [
      // { context: [['list', 0], ['bacon',0], ['deluxe', 0]], choose: [1,2] },
      { context: [['list', 0], ['food',0], ['combo', 0]], ordered: true, choose: [0,1] },
      { context: [['combo', 0], ['number', 0], ['list',0], ['number', 0]], ordered: true, choose: [1,2,3] },
      { context: [['combo', 0], ['comboNumber', 0], ['list', 1]], ordered: true, choose: [1] },
      { context: [['number', 0], ['numberNumberCombo', 0], ['list', 1]], ordered: true, choose: [1] },
      { context: [['number', 1], ['numberNumberCombo', 1], ['combo', 0]], ordered: true, choose: [2] },
      /*
      { context: [['list', 0], ['number', 0], ['combo', 0], ['number', 0]], choose: [1,2,3] },
      { context: [['list', 0], ['number', 1], ['combo', 0], ['number', 0]], choose: [1,2,3] },
      { context: [['list', 0], ['number', 1], ['combo', 0], ['number', 1]], choose: [1,2,3] },
      */
      { context: [['combo', 1], ['list', 0], ['number', 1], ['combo', 1]], ordered: true, choose: [2,3] },
      { context: [['list', 0], ['number', 1], ['combo', 1]], ordered: true, choose: [1,2] },
      // { context: [['list', 0], ['number', 1], ['combo', 0]], choose: [1, 2]},
      // { context: [['list', 0], ['combo', 0], ['number', 1]], choose: [1, 2]},
    ],
    semantics: [
      {
        where: where(),
        priority: -10,
        match: ({context}) => context.marker == 'compound_operator',
        apply: ({context, s}) => {
          context.marker = 'list'
          context.flatten = true
          s(context)
        }
      },
      {
        where: where(),
        match: ({context, isAListable}) => isAListable(context, 'edible') && context.marker !== 'edible' && !context.same && !context.isResponse,
        apply: ({context, km, api, instance}) => {
          for (const element of propertyToArray(context)) {
            km('fastfood').api.state.add(element)
          }
        }
      },
      {
        where: where(),
        match: ({context, api}) => context.marker == 'controlEnd' && api.hasAskedForButNotAvailable(),
        apply: ({context, insert, api, gp, toContext}) => {
          const naArray = api.getAskedForButNotAvailable()
          naArray.forEach((f) => f.paraphrase = true)
          const naContext = toContext(naArray)
          naContext.isResponse = true
          naContext.verbatim = `The following are not menu items: ${gp(naContext)}`
          insert(naContext)
        }
      }
    ],
    floaters: ['quantity'],
    bridges: [
      { 
        id: 'orderNoun',
        parents: ['noun', 'queryable'],
        evaluator: ({context, api}) => {
          context.evalue = { marker: 'list', value: api.objects.items }
          api.show()
        }
      },
      { 
        id: 'showOrder',
        parents: ['verby'],
        bridge: "{ ...next(operator), order: after[0] }",
        generatorp: ({context, g}) => `show ${g(context.order)}`,
        semantic: ({api}) => {
          api.state.show()
        },
      },
    ],
  }, module)
  config.add(edible())
  config.add(countable())
  config.add(events())
  config.add(sizeable())
  config.api = api
  config.initializer( ({api}) => {
    api.state = new State(api)
  })
  return config
}

knowledgeModule( {
    module,
    description: 'fastfood related concepts',
    createConfig,
    test: {
            name: './fastfood.test.json',
            contents: fastfood_tests,
            checks: {
              objects: [
                'show', 
                'items', 
                'changes', 
                { property: 'notAvailable', filter: [ 'marker', 'value', 'text' ] }, 
                { property: 'quantity', filter: ['marker', 'value', 'text' ] },
              ],
              context: [
                ...defaultContextCheck,
                { property: 'comboNumber', filter: ['marker', 'value', 'text' ] },
              ],
            },
          },
    template: {
      template,
      instance: fastfood_instance,
    },
})
