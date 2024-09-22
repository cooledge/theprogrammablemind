const { Config, knowledgeModule, where, stableId } = require('./runtime').theprogrammablemind
const meta = require('./meta.js')
const gdefaults = require('./gdefaults.js')
const sdefaults = require('./sdefaults.js')
const articles = require('./articles.js')
const pos = require('./pos.js')
const negation = require('./negation.js')
const punctuation = require('./punctuation.js')
const stm = require('./stm.js')
const _ = require('lodash')
const { API } = require('./helpers/dialogues')
const { isMany } = require('./helpers')
const dialogues_tests = require('./dialogues.test.json')
const { defaultContextCheck, indent, focus } = require('./helpers')
const pluralize = require('pluralize')

const api = new API()

const warningIsANotImplemented = (log, context) => {
  const description = 'WARNING from Dialogues KM: For semantics in order to handle sentences of type "x is y?", set the response to what you like.'
  const match = `({context, hierarchy}) => hierarchy.isA(context.marker, 'is') && context.query && <other conditions as you like>`
  const apply = `({context}) => <do stuff...>; context.evalue = <value>`
  const input = indent(JSON.stringify(context, null, 2), 2)
  const message = `${description}\nThe semantic would be\n  match: ${match}\n  apply: ${apply}\nThe input context would be:\n${input}\n`
  log(indent(message, 4))
}

const warningSameNotEvaluated = (log, one) => {
  const description = 'WARNING from Dialogues KM: For the "X is Y" type phrase implement a same handler.'
  const match = `({context}) => context.marker == '${one.marker}' && context.same && <other conditions as you like>`
  const apply = '({context}) => <do stuff... context.same is the other value>; context.sameWasProcessed = true'
  const input = indent(JSON.stringify(one, null, 2), 2)
  const message = `${description}\nThe semantic would be\n  match: ${match}\n  apply: ${apply}\nThe input context would be:\n${input}\n`
  log(indent(message, 4))
}

// TODO implement what / what did you say ...
let configStruct = {
  name: 'dialogues',
  operators: [
    "([makeObject] (word))",
    "([setIdSuffix] (word))",
    "([resetIdSuffix])",

    "(([queryable]) [is|] ([queryable|]))",
    "([is:queryBridge|] ([queryable]) ([queryable]))",
    // "(([queryable]) [is:isEdBridge|is,are] ([isEdAble|]))",
    "(([queryable]) [(<isEd|> ([isEdAble|]))])",

    "([nevermind])",
    { pattern: "([nevermindTestSetup] (allowed))", development: true },
    "([why])",
    "([reason])",
    // "([thisitthat|])",
    // "([it])",
    // "([this])",
    // "([that])",

    "(<what> ([whatAble|]))",
    "([what:optional])",
    // "(<the|> ([theAble|]))",
    // "(<a|a,an> ([theAble|]))",
    // "([unknown])",

    "([be] ([briefOrWordy|]))",

    "([([canBeQuestion])])",
    "(([canBeQuestion/1,2]) <questionMark|>)",
    // "(([is/2]) <questionMark|>)",

    "(([what]) [(<does|> ([doesAble|]))])",
    "([canBeDoQuestion])",
    "(<does|> ([canBeDoQuestion/0,1]))",
    // make what is it work <<<<<<<<<<<<<<<<<<<<<<<, what is greg
    // joe is a person the age of joe ...
    //"arm them, what, the phasers"
    //greg is a first name
    "(x [list|and] y)",
    "([yesno|])",
    "(([isEdee])^ <isEdAble|> ([by] ([isEder])?))",
    "([isEdee|])",
    "([isEder|])",
    { pattern: "([debug23])" },

    "([to] ([toAble|]))",
  ],
  associations: {
    negative: [
      // [['isEd', 0], ['unknown', 0]],
      // [['isEd', 0], ['unknown', 1]],
      // [['is', 0], ['means', 0]],
    ],
    positive: [
      // [['is', 0], ['unknown', 0]],
      // [['is', 0], ['unknown', 1]],
      // [['isEd', 0], ['means', 0]],
      [['isEdee', 0], ['isEd', 0], ['isEder', 0], ['by', 0]],
      [['isEdee', 0], ['isEd', 0], ['isEdAble', 0]],
      [['unknown', 1], ['isEd', 0], ['isEdAble', 0]],
      [['unknown', 0], ['isEd', 0], ['isEdAble', 0]],
      [["isEd",0],["unknown",1],["isEdAble",0]],

    ]
  },
  bridges: [
    {
      id: 'makeObject',
      bridge: "{ ...next(operator), object: after[0] }",
      generatorp: async ({context, gp}) => `${context.word} ${await gp(context.object)}`,
      semantic: ({config, context, api}) => {
			  api.makeObject({ context: context.object, config, types: [] })
      }
    },
    {
      id: 'setIdSuffix',
      bridge: "{ ...next(operator), suffix: after[0] }",
      generatorp: async ({context, gp}) => `${context.word} ${await gp(context.suffix)}`,
      semantic: ({context, api}) => {
        api.setIdSuffix(context.suffix.text)
      }
    },
    {
      id: 'resetIdSuffix',
      bridge: "{ ...next(operator) }",
      semantic: ({context, api}) => {
        api.setIdSuffix('')
      }
    },

    { id: "by", level: 0, bridge: "{ ...next(operator), object: after[0] }", optional: { 'isEder': "{ marker: 'unknown', implicit: true, concept: true }", }, },

    { id: "debug23", level: 0, bridge: "{ ...next(operator) }" },
    // { id: "what", level: 0, bridge: "{ ...next(operator), ...after[0], query: ['what'], determined: true }" },
    { id: "what", level: 0, optional: "{ ...next(operator), query: ['what'], determined: true }", bridge: "{ ...after, query: ['what'], modifiers: ['what'], what: operator }" },
    { id: "whatAble", level: 0, bridge: "{ ...next(operator) }" },

    // context.instance == variables.instance (unification)
    {
      id: "list", 
      level: 0, 
      selector: {
          match: "same", 
          left: [ { pattern: '($type && context.instance == variables.instance)' } ], 
          right: [ { pattern: '($type && context.instance == variables.instance)' } ], 
          left: [ { pattern: '($type)' } ], 
          right: [ { pattern: '($type)' } ], 
          passthrough: true
      }, 
      bridge: "{ ...next(operator), listable: true, isList: true, value: append(before, after) }"
    },
    {
      id: "list", 
      level: 1, 
      selector: {
          match: "same", 
          left: [ { pattern: '($type && context.instance == variables.instance)' } ], 
          passthrough: true
     }, 
      bridge: "{ ...operator, value: append(before, operator.value) }"
    },
    {   
        where: where(),
        id: "to", 
        level: 0, 
        isA: ['preposition'],
        bridge: "{ ...next(operator), toObject: after[0] }",
        generatorp: async ({context, gp}) => {
          return `to ${await gp(context.toObject)}`
        },
    },
    { id: "toAble", level: 0, bridge: "{ ...next(operator) }" },

    { id: "be", level: 0, bridge: "{ ...next(operator), type: after[0] }" },
    { id: "briefOrWordy", level: 0, bridge: "{ ...next(operator) }" },

    { id: "yesno", level: 0, bridge: "{ ...next(operator) }" },
    { id: "canBeQuestion", level: 0, bridge: "{ ...next(operator) }" },
    { id: "canBeQuestion", level: 1, bridge: "{ ...next(operator) }" },
    // { id: "unknown", level: 0, bridge: "{ ...next(operator), unknown: true, dead: true }" },
    // { id: "unknown", level: 1, bridge: "{ ...next(operator) }" },
    // { id: "queryable", level: 0, bridge: "{ ...next(operator) }" },
    { id: "questionMark", level: 0, bridge: "{ ...before[0], query: [before.marker] }" },
    // { id: "isEd", level: 0, bridge: "{ ...context, query: true }" },
    // gregbug
    // context.subject == ['owner'] but could be list of properties
    // { id: "isEd", level: 0, bridge: "{ number: operator.number, ...context, [subject].number: operator.number }" },
    // { id: "isEd", level: 0, bridge: "{ number: operator.number, ...context, properties(subject).number: operator.number }" },
    // NO or symlink subject: link(current.ownee)  // any other operator...
    // NO { id: "isEd", level: 0, bridge: "{ number: operator.number, ...context, subject.number: operator.number }" },
    { id: "isEd", level: 0, bridge: "{ number: operator.number, ...context, [context.subject].number: operator.number }" },
    // { id: "isEd", level: 0, bridge: "{ ...context }" },
    { id: "isEdAble", level: 0, bridge: "{ ...next(operator) }" },
    { id: "isEdAble", level: 1, bridge: "{ ...next(operator) }" },
    { id: "isEdee", level: 0, bridge: "{ ...next(operator) }" },
    { id: "isEder", level: 0, bridge: "{ ...next(operator) }" },
    { id: "is", level: 0, 
            bridge: "{ ...next(operator), one: { number: operator.number, ...before[0] }, two: after[0] }", 
            isA: ['verby'],
            queryBridge: "{ ...next(operator), one: after[0], two: after[1], query: true }" ,
    },
    { id: "is", level: 1, bridge: "{ ...next(operator) }" },

    { id: "canBeDoQuestion", level: 0, bridge: "{ ...next(operator) }" },
    { id: "canBeDoQuestion", level: 1, bridge: "{ ...next(operator) }" },
    { id: "canBeDoQuestion", level: 2, bridge: "{ ...next(operator) }" },
    { id: "doesAble", level: 0, bridge: "{ ...next(operator) }" },
    { id: "doesAble", level: 1, bridge: "{ ...next(operator), before: before[0] }" },
    { id: "does", level: 0, bridge: "{ query: true, what: operator.marker, ...context, number: operator.number, object.number: operator.number }*" },

    /*
    { 
      id: 'the', 
      level: 0, 
      bridge: '{ ...after[0], focusableForPhrase: true, pullFromContext: true, concept: true, wantsValue: true, determiner: "the", modifiers: append(["determiner"], after[0].modifiers)}' 
    },
    { 
      id: "a", 
      level: 0, 
      // bridge: "{ ...after[0], pullFromContext: false, instance: true, concept: true, number: 'one', wantsValue: true, determiner: operator, modifiers: append(['determiner'], after[0].modifiers) }" 
      bridge: "{ ...after[0], pullFromContext: false, concept: true, number: 'one', wantsValue: true, determiner: operator, modifiers: append(['determiner'], after[0].modifiers) }" 
    },
    */
    /*
    { 
      id: "theAble", 
      children: ['noun'],
      bridge: "{ ...next(operator) }" 
    },
    */

    // TODO make this hierarchy thing work
    /*
    { 
      id: "thisitthat", 
      level: 0, 
      isA: ['queryable'], 
      before: ['verby'],
      bridge: "{ ...next(operator) }" 
    },
    */
    { 
      id: "nevermind", 
      bridge: "{ ...next(operator) }",
      semantic: (args) => {
        const {config, context} = args
        // stop asking all questions
        for (const semantic of config.semantics) {
          if (semantic.isQuestion) {
            let doRemove = true
            if (semantic.onNevermind && semantic.getWasAsked() && !semantic.getWasApplied()) {
              doRemove = semantic.onNevermind(args)
            }
            if (doRemove) {
              config.removeSemantic(semantic)
            }
          }
        }
      }
    },
    { 
      id: "nevermindTestSetup", 
      development: true,
      bridge: "{ ...next(operator), type: after[0], postModifiers: ['type'] }",
      semantic: ({ask, context}) => {
        const nevermindType = context.type.value
        ask({
          applyq: () => 'the test question?',
          onNevermind: ({objects, context}) => {
            objects.onNevermindWasCalled = true
            objects.nevermindType = nevermindType
            return nevermindType == 'accept'
          },
          matchr: () => false,
          applyr: () => {},
        })
      }
    },
    { 
      id: "why", 
      level: 0, 
      bridge: "{ ...next(operator), pullFromContext: true, types: ['reason'], isResponse: true }" 
    },
    { 
      id: "reason", 
      level: 0, 
      isA: ['theAble', 'queryable'], 
      bridge: "{ ...next(operator) }" 
    },
    /*
    { 
      id: "it", 
      level: 0, 
      isA: ['thisitthat'], 
      bridge: "{ ...next(operator), pullFromContext: true, unknown: true, determined: true }" 
    },
    { 
      id: "this", 
      level: 0, 
      isA: ['thisitthat'], 
      bridge: "{ ...next(operator), unknown: true, pullFromContext: true }" 
    },
    { 
      id: "that", 
      level: 0, 
      isA: ['thisitthat'], 
      bridge: "{ ...next(operator), unknown: true, pullFromContext: true }" 
    },
    */
  ],
  words: {
    "literals": {
      "?": [{"id": "questionMark", "initial": "{}" }],
      // "the": [{"id": "the", "initial": "{ modifiers: [] }" }],
      "who": [{"id": "what", "initial": "{ modifiers: [], query: true }" }],
      "yes": [{"id": "yesno", "initial": "{ value: true }" }],
      "no": [{"id": "yesno", "initial": "{ value: false }" }],
      "brief": [{"id": "briefOrWordy", "initial": "{ value: 'brief' }" }],
      "wordy": [{"id": "briefOrWordy", "initial": "{ value: 'wordy' }" }],
      "does": [{"id": "does", "initial": "{ number: 'one' }" }],
      "do": [{"id": "does", "initial": "{ number: 'many' }" }],
      "is": [{"id": "is", "initial": "{ number: 'one' }" }, {"id": "isEd", "initial": "{ number: 'one' }" }],
      "are": [{"id": "is", "initial": "{ number: 'many' }" }, {"id": "isEd", "initial": "{ number: 'many' }" }],
    }
  },

  floaters: ['query'],
  priorities: [
    { "context": [['is', 0], ['means', 0], ], "choose": [0] },
    { "context": [["what",0], ["does",0],], "choose": [0] },
    { "context": [["is",0], ["is",1],], "choose": [0] },
    { "context": [["isEdAble",0], ["isEd",0],], "choose": [0] },
    { "context": [['a', 0], ['is', 0], ['does', 0], ], "choose": [0] },
    { "context": [['isEd', 0], ['means', 0], ], "choose": [0] },
    { "context": [['articlePOS', 0], ['isEdAble', 0], ], "choose": [0] },
    { "context": [['isEdAble', 0], ['is', 0], ], "choose": [0] },
    { "context": [['isEdAble', 0], ['is', 1], ], "choose": [0] },
  ],
  hierarchy: [
    ['doubleQuote', 'queryable'],
    ['it', 'pronoun'],
    ['this', 'pronoun'],
    ['questionMark', 'punctuation'],
    // ['questionMark', 'isEd'],
    ['a', 'articlePOS'],
    ['the', 'articlePOS'],
    ['unknown', 'theAble'],
    ['unknown', 'queryable'],
    ['it', 'queryable'],
    ['what', 'queryable'],
    ['whatAble', 'queryable'],
    ['is', 'canBeQuestion'],
    ['it', 'toAble'],
    ['this', 'queryable'],
  ],
  debug: false,
  version: '3',
  generators: [
    {
      where: where(),
      notes: "handle making responses brief",
      match: ({context, objects}) => (context.topLevel || context.isResponse) && objects.brief && !context.briefWasRun,
      apply: async ({context, g}) => {
        const focussed = focus(context)
        context.briefWasRun = true
        return await g(focussed)
      },
      priority: -2,
    },
    {
      where: where(),
      notes: "unknown ",
      match: ({context}) => context.marker == 'unknown' && context.implicit,
      apply: ({context}) => '',
    },
    {
      where: where(),
      notes: "unknown answer default response",
      match: ({context}) => context.marker == 'answerNotKnown',
      apply: ({context}) => `that is not known`,
    },
    {
      where: where(),
      notes: "be brief or wordy",
      match: ({context}) => context.marker == 'be',
      apply: ({context}) => `be ${context.type.word}`,
    },
    /*
    {
       notes: 'paraphrase: plural/singular',
       priority: -1,
      where: where(),
       match: ({context}) => context.paraphrase && context.word
       apply: ({context, g}) => { return { "self": "your", "other": "my" }[context.value] },
    },
    */
    {
      where: where(),
      match: ({context}) => context.marker === 'error' && context.paraphrase,
      apply: ({context, gp}) => gp(context.context)
    },
    {
      where: where(),
      match: ({context}) => context.marker === 'idontknow',
      apply: ({context}) => "i don't know",
    },
    {
      where: where(),
      match: ({context}) => context.marker == 'yesno',
      apply: ({context}) => context.value ? 'yes' : 'no',
      priority: -1,
      // debug: 'call11',
    },
    {
      where: where(),
      match: ({context}) => !context.paraphrase && context.evalue && context.evalue.marker == 'yesno',
      apply: ({context}) => context.evalue.value ? 'yes' : 'no',
      priority: -1,
    },

    {
      where: where(),
      notes: 'handle lists with yes no',
      // ({context, hierarchy}) => context.marker == 'list' && context.paraphrase && context.value,
      // ({context, hierarchy}) => context.marker == 'list' && context.value,
      match: ({context, hierarchy}) => context.marker == 'list' && context.paraphrase && context.value && context.value.length > 0 && context.value[0].marker == 'yesno',
      apply: async ({context, g, gs}) => {
        return `${await g(context.value[0])} ${await gs(context.value.slice(1), ', ', ' and ')}`
      }
    },

    {
      where: where(),
      notes: 'handle lists',
      // ({context, hierarchy}) => context.marker == 'list' && context.paraphrase && context.value,
      // ({context, hierarchy}) => context.marker == 'list' && context.value,
      match: ({context, hierarchy}) => context.marker == 'list' && context.value,
      apply: async ({context, gs}) => {
        if (context.newLinesOnly) {
          return await gs(context.value, '\n')
        } else {
          return await gs(context.value, ', ', ' and ')
        }
      }
    },

    {
      where: where(),
      notes: 'paraphrase a queryable response',
      // || context.evalue.paraphrase -> when the evalue acts as a paraphrase value
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'queryable') && !context.isQuery && context.evalue && (!context.paraphrase || context.evalue.paraphrase),
      apply: async ({context, g}) => {
        return await g(context.evalue)
      }
    },
    {
      where: where(),
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'queryable') && !context.isQuery && context.isSelf && context.subject == 'my',
      apply: ({context}) => `your ${context.word}`
    },
    { 
      where: where(),
      match: ({context, hierarchy}) => ['it', 'what'].includes(context.marker) && context.paraphrase, 
      apply: ({context}) => `${context.word}`
    },
    {
      where: where(),
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'queryable') && !context.isQuery && context.isSelf && context.subject == 'your',
      apply: ({context}) => `my ${context.word}`
    },
    { 
      where: where(),
      match: ({context, hierarchy}) => ['my', 'your'].includes(context.subject) && hierarchy.isA(context.marker, 'queryable') && context.paraphrase, 
      apply: ({context}) => `${context.subject} ${context.marker}`
    },
    {
      where: where(),
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'queryable') && !context.isQuery && context.subject,
      apply: ({context}) => `${context.subject} ${context.word}`
    },
    { 
      where: where(),
      match: ({context}) => context.marker == 'name' && !context.isQuery && context.subject, 
      apply: ({context}) => `${context.subject} ${context.word}` 
    },
    {
      where: where(),
      match: ({context}) => context.evalue && context.evalue.verbatim && !context.paraphrase,
      apply: ({context}) => context.evalue.verbatim,
    },
    {
      where: where(),
      match: ({context}) => context.isResponse && context.verbatim && !context.paraphrase,
      apply: ({context}) => context.verbatim,
      priority: -1,
    },
    { 
      where: where(),
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'canBeQuestion') && context.paraphrase && context.topLevel && context.query,
      apply: async ({context, gp}) => {
        return `${await gp({...context, topLevel: undefined})}?` 
      },
      priority: -1,
    },
    { 
      where: where(),
      notes: "x is y",
      match: ({context, hierarchy}) => { return hierarchy.isA(context.marker, 'is') && context.paraphrase },
      apply: async ({context, g, gp}) => {
        return `${await g({ ...context.one, paraphrase: true })} ${context.word} ${await gp(context.two)}` 
      }
    },
    { 
      where: where(),
      notes: 'is with a response defined',
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'is') && context.evalue,
      apply: async ({context, g, gs}) => {
        const response = context.evalue;
        const concept = response.concept;
        if (concept) {
          concept.paraphrase = true
          concept.isSelf = true
          const instance = await g(response.instance)
          return `${await g(concept)} ${context.word} ${instance}` 
        } else {
          if (Array.isArray(response)) {
            return `${await gs(response)}` 
          } else {
            return `${await g(response)}` 
          }
        }
      }
    },
    { 
      where: where(),
      notes: 'x is y (not a response)',
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'is') && !context.evalue,
      apply: async ({context, g, gp, gr, callId}) => {
        if ((context.two.evalue || {}).marker == 'answerNotKnown') {
          return await g(context.two.evalue)
        }

        if (!context.isResponse) {
          return `${await gp(context.one)} ${isMany(context.one) || isMany(context.two) || isMany(context) ? "are" : "is"} ${await g(context.two)}`
        }

        const hasFocus = (property) => {
          if (context.focusableForPhrase) {
            return true
          }
          if (context.focusable && context.focusable.includes(property) && context[property].focus) {
            return true
          }
        }
        let focus;
        if (context.two.hierarchy && !isMany(context.two)) {
          focus = 'one'
        } else if (context.one.focusableForPhrase && !context.two.focusableForPhrase) {
          focus = 'one'
        } else if (!context.one.focusableForPhrase && context.two.focusableForPhrase) {
          focus = 'two'
        } else if (hasFocus('two')) {
          focus = 'two'
        } else {
          focus = 'one'
        }
        // greg101
        if (focus == 'one') {
          return `${await g(context.two)} ${isMany(context.one) || isMany(context.two) || isMany(context) ? "are" : "is"} ${await gp(context.one)}`
        } else {
          // TODO fix this using the assumed and that whole mess. change isResponse to useValue
          if (context.isResponse) {
            return `${await gp(context.one, { responding: true })} ${isMany(context.one) || isMany(context.two) || isMany(context) ? "are" : "is"} ${await g(context.two)}`
          } else {
            return `${await gp(context.one)} ${isMany(context.one) || isMany(context.two) || isMany(context) ? "are" : "is"} ${await gr(context.two)}`
          }
        }
      },
    },
  ],

  semantics: [
    {
      where: where(),
      todo: 'debug23',
      match: ({context}) => context.marker == 'debug23',
      apply: ({context, hierarchy}) => {
        debugger
        debugger
      },
    },
    { 
      where: where(),
      todo: 'be brief or wordy',
      match: ({context}) => context.marker == 'be',
      apply: ({context, api}) => {
        api.setBrief( context.type.value == 'brief' )
      },
    },
    {
      where: where(),
      match: ({context}) => context.marker === 'error',
      apply: async ({context, gp}) => {
        context.evalue = "That is not known"
        if (context.reason) {
          context.evalue += ` because ${await gp(context.reason)}`
        }
        context.isResponse = true
      }
    },
//  { 
//    where: where(),
//    notes: 'pull from context',
//    // match: ({context}) => context.marker == 'it' && context.pullFromContext, // && context.value,
//    match: ({context, callId}) => false && context.pullFromContext && !context.same, // && context.value,
//    apply: async ({callId, context, kms, e, log, retry}) => {
//      if (true) {
//        /*
//                 {
//                    "marker": "unknown",
//                    "range": {
//                      "start": 65,
//                      "end": 73
//                    },
//                    "word": "worth",
//                    "text": "the worth",
//                    "value": "worth",
//                    "unknown": true,
//                    "types": [
//                      "unknown"
//                    ],
//                    "pullFromContext": true,
//                    "concept": true,
//                    "wantsValue": true,
//                    "determiner": "the",
//                    "modifiers": [
//                      "determiner"
//                    ],
//                    "evaluate": true
//                  }

//        */
//        context.value = kms.stm.api.mentions(context)
//        if (!context.value) {
//          // retry()
//          context.value = { marker: 'answerNotKnown' }
//          return
//        }
//        
//        const instance = await e(context.value)
//        if (instance.evalue && !instance.edefault) {
//          context.value = instance.evalue
//        }
//        if (context.evaluate) {
//          context.evalue = context.value
//        }
//    },
//  },
    { 
      where: where(),
      notes: 'what x is y?',
      /*
        what type is object (what type is pikachu)   (the type is typeValue)
        what property is object (what color are greg's eyes)
        object is a type (is greg a human) // handled by queryBridge
      */

      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'is') && context.query,
      apply: async ({context, s, log, km, objects, e}) => {
        const one = context.one;
        const two = context.two;
        let concept, value;
        if (one.query) {
          concept = one;
          value = two;
        } else {
          concept = two;
          value = one;
        }
        // km('dialogues').api.mentioned(concept)
        // TODO wtf is the next line?
        value = JSON.parse(JSON.stringify(value))
        let instance = await e(value)
        if (false && instance.evalue) {
          km('stm').api.mentioned({ context: value })
        }
        if (instance.verbatim) {
          context.evalue = { verbatim: instance.verbatim }
          context.isResponse = true
          return
        }
        // instance.focusable = ['one', 'two']
        // concept = JSON.parse(JSON.stringify(value)) 
        concept = _.cloneDeep(value) 
        concept.isQuery = undefined
        // greg101
        // instance.focusableForPhrase = true
        instance.focus = true
        if (concept.hierarchy) {
          concept.focusableForPhrase = true
        }
        // concept.focus = true

        const many = isMany(concept) || isMany(instance)
        const evalue = {
          "default": true,
          "marker": "is",
          "one": concept,
          "two": instance,
          "focusable": ['two', 'one'],
          "word": many ? "are" : "is",
          "number": many ? "many" : undefined,
        }
        context.evalue = evalue
        context.isResponse = true
      }
    },
    { 
      where: where(),
      notes: 'x is y?',
      match: ({context, hierarchy}) => hierarchy.isA(context.marker, 'is') && context.query,
      apply: ({context, log}) => {
        warningIsANotImplemented(log, context)
        context.evalue = {
          verbatim: "I don't know"
        }
        context.isResponse = true
      }
    },

    // statement
    { 
      /*
         a car is a vehicle           isA
         cars are vehicles            isA
         the ford is a car            isA
         a name is car                isA (reverse)
         the formula is x + 5         not isA
         x is 5                       not isA
         worth is price * quantity    not isA
         the name is cars             not isA

      */
      where: where(),
      notes: 'x is y. handles x is a kind of y or x = y in the stm',
      match: ({context}) => context.marker == 'is' && !context.query && context.one && context.two,
      apply: async ({context, s, log, api, kms, config}) => {
        // const oneZero = { ...context.one }
        // const twoZero = { ...context.two }

        const one = context.one;
        const two = context.two;
        one.same = two;
        const onePrime = await s(one)
        if (!onePrime.sameWasProcessed) {
          warningSameNotEvaluated(log, one)
        } else {
          if (onePrime.evalue) {
            context.evalue = onePrime.evalue
            context.isResponse = true
          }
        }
        one.same = undefined
        let twoPrime;
        if (!onePrime.sameWasProcessed) {
          two.same = one
          twoPrime = await s(two)
          if (!twoPrime.sameWasProcessed) {
            warningSameNotEvaluated(log, two)
          } else {
            if (twoPrime.evalue) {
              context.evalue = twoPrime.evalue
            }
          }
          two.same = undefined
        }

        // if not isA add to stm
        if (!onePrime.sameWasProcessed && !twoPrime.sameWasProcessed) {
					api.makeObject({ context: one, config, types: context.two.types || [] })
					kms.stm.api.setVariable(one.value, two)
					kms.stm.api.mentioned({ context: one, value: two })
        }
      }
    },
    {
      where: where(),
      notes: 'get variable from stm',
      // match: ({context, kms}) => !context.determiner && context.evaluate && kms.stm.api.getVariable(context.value) != context.value,
      match: ({context, kms}) => context.evaluate && kms.stm.api.getVariable(context.value) != context.value,
      // match: ({context, kms}) => context.evaluate,
      priority: -1,
      apply: async ({context, kms, e}) => {
        const api = kms.stm.api
        context.value = api.getVariable(context.value)
        if (context.value && context.value.marker) {
          context.evalue = await e(context.value)
        }
        context.focusableForPhrase = true
      }
    },
  ],
};

// move ask to the KM's since verbatim is called probably in dialogues?
const getAsk = (config) => (uuid) => {
    return (asks) => {
    const ask = (ask) => {
      let oneShot = true // default
      if (ask.oneShot === false) {
        oneShot = false
      }

      const id_q = stableId('semantic')
      const id_rs = []
      let wasAsked = false
      let wasApplied = false
      const getWasAsked = () => {
        return wasAsked
      }
      const setWasAsked = (value) => {
        wasAsked = value
      }
      const getWasApplied = () => {
        return wasApplied
      }
      const setWasApplied = (value) => {
        wasApplied = value
      }

      const semanticsr = ask.semanticsr || []
      if (semanticsr.length == 0) {
        semanticsr.push({ match: ask.matchr, apply: ask.applyr })
      }
      for (const semantic of semanticsr) {
        const id_r = stableId('semantic')
        id_rs.push(id_r)
        config.addSemantic({
          uuid,
          id: id_r,
          tied_ids: [id_q],
          oneShot,
          where: semantic.where || ask.where || where(2),
          source: 'response',
          match: (args) => semantic.match(args),
          apply: async (args) => {
            setWasApplied(true)
            await semantic.apply(args)
          },
        })
      }

      config.addSemantic({
        uuid,
        oneShot,
        id: id_q,
        tied_ids: id_rs,
        where: ask.where,
        isQuestion: true,  // do one question at a time
        getWasAsked,
        getWasApplied,
        onNevermind: ask.onNevermind,
        source: 'question',
        match: ({ context }) => context.marker == 'controlEnd' || context.marker == 'controlBetween',
        apply: async (args) => {
          let matchq = ask.matchq
          let applyq = ask.applyq
          if (!matchq) {
            let wasAsked = false
            matchq = () => !wasAsked,
            applyq = (args) => {
              wasAsked = true
              return ask.applyq(args)
            }
          }
          if (await matchq(args)) {
            setWasAsked(true)
            setWasApplied(false)
            // args.context.motivationKeep = true
            args.verbatim(await applyq(args))
            /*
              args.context.verbatim = applyq(args)
              args.context.isResponse = true;
              delete args.context.controlRemove;
              */
            args.context.controlKeepMotivation = true
          }
          args.context.cascade = true
        }
      })
    }
    if (!Array.isArray(asks)) {
      asks = [asks]
    }

    [...asks].reverse().forEach( (a) => ask(a) )
  }
}


const createConfig = async () => {
  const config = new Config(configStruct, module)
  config.stop_auto_rebuild()
  await config.setApi(new API())
  await config.add(articles, gdefaults, sdefaults, pos, negation, stm, meta, punctuation)
  await config.initializer( ({objects, config, isModule}) => {
    /* TODO add this beck in. some stuff from config needs to be here
    config.addArgs((args) => ({ 
      e: (context) => config.api.getEvaluator(args.s, args.log, context),
    }))
    */
    config.addArgs(({config, api, isA}) => ({ 
      isAListable: (context, type) => {
        if (context.marker == 'list' || context.listable) {
          return context.value.every( (element) => isA(element.marker, type) )
        } else {
          return isA(context.marker, type)
        } 
      },
      toContext: (v) => {
        if (Array.isArray(v)) {
          return { marker: 'list', level: 1, value: v }
        }
        if (v.marker == 'list') {
          return v
        }
        return v
      },
      getUUIDScoped: (uuid) => { return {
          ask: getAsk(config)(uuid),
        } 
      },
      toScopedId: (context) => {
        return api('dialogues').toScopedId(context)
      },
    }))
    objects.mentioned = []
    objects.variables = {
    }
    if (isModule) {
    } else {
      config.addWord("canbedoquestion", { id: "canBeDoQuestion", "initial": "{}" })
      config.addWord("doesable", { id: "doesAble", "initial": "{}" })
    }
  })
  await config.restart_auto_rebuild()
  return config
}

const initializer = ({objects, config, isModule}) => {
  /* TODO add this beck in. some stuff from config needs to be here
  config.addArgs((args) => ({ 
    e: (context) => config.api.getEvaluator(args.s, args.log, context),
  }))
  */
  config.addArgs(({config, api, isA}) => ({ 
    isAListable: (context, type) => {
      if (context.marker == 'list' || context.listable) {
        return context.value.every( (element) => isA(element.marker, type) )
      } else {
        return isA(context.marker, type)
      } 
    },
    toContext: (v) => {
      if (Array.isArray(v)) {
        return { marker: 'list', level: 1, value: v }
      }
      if (v.marker == 'list') {
        return v
      }
      return v
    },
    getUUIDScoped: (uuid) => { return {
        ask: getAsk(config)(uuid),
      } 
    },
    toScopedId: (context) => {
      return api('dialogues').toScopedId(context)
    },
  }))
  objects.mentioned = []
  objects.variables = {
  }
  if (isModule) {
  } else {
    config.addWord("canbedoquestion", { id: "canBeDoQuestion", "initial": "{}" })
    config.addWord("doesable", { id: "doesAble", "initial": "{}" })
  }
}

knowledgeModule( { 
  config: configStruct,
  includes: [articles, gdefaults, sdefaults, pos, negation, stm, meta, punctuation],
  initializer,
  api: () => new API(),

  createConfig,
  module,
  description: 'framework for dialogues',
  newWay: true,
  test: {
    name: './dialogues.test.json',
    contents: dialogues_tests,
    checks: {
            objects: ['onNevermindWasCalled', 'nevermindType', 'idSuffix'],
            context: defaultContextCheck,
          },

  },
})
