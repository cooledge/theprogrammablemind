const { Config, knowledgeModule, where } = require('./runtime').theprogrammablemind
const tell = require('./tell')
const helpers = require('./helpers')
const time_tests = require('./time.test.json')

const pad = (v, l) => {
  const s = String(v)
  const n = l - s.length
  return "0".repeat(n) + s
}

class API {
  // gets the contexts for doing the happening
  semantics({context, isModule, args, kms}) {
    const api = kms.time.api
    const values = args({ types: ['ampm', 'time'], properties: ['one', 'two']  })
    const ampm = context[values[0]]
    let hour = ampm.hour.hour
    if (ampm.ampm == 'pm') {
      hour += 12;
    }
    const ms = helpers.millisecondsUntilHourOfDay(api.newDate, hour)
    const promise =  new Promise((resolve) => {
      setTimeout( () => resolve(context), ms);
    }).then( () => context )
    context.event = promise
  }

  newDate() {
    return new Date()
  }

  initialize() {
  }
}
const api = new API()

let config = {
  name: 'time',
  operators: [
    "([time])",
    "([use] ((<count> ([timeUnit])) [timeFormat|format]))",
    "(([hourUnits|]) [ampm|])"
    //"(([anyConcept]) [equals|is] ([anyConcept]))",
    //"(([what0|what]) [equals] (<the> ([timeConcept])))",
    //"(<whatP|what> ([anyConcept]))",
    //"what is the time in 24 hour format"
    //"what time is it in Paris"
    //"what time is it in GMT"
    // what is the time
    // how many hours are in a day
  ],
  bridges: [
    { "id": "time", "level": 0, "bridge": "{ ...next(operator) }" },

    { "id": "hourUnits", "level": 0, "bridge": "{ ...next(operator) }" },
    { "id": "ampm", "level": 0, "bridge": "{ ...next(operator), hour: before[0] }" },

    { "id": "timeFormat", "level": 0, "bridge": "{ ...before[0], ...next(operator) }" },
    { "id": "count", "level": 0, "bridge": "{ ...after, count: operator.value }" },
    { "id": "timeUnit", "level": 0, "bridge": "{ ...next(operator) }" },
    { "id": "use", "level": 0, 
            bridge: "{ ...next(operator), format: after[0] }",
            generatorp: ({g, context}) => `use ${context.format.count} hour time` 
    },
  ],
  hierarchy: [
    ['time', 'queryable'],
    ['ampm', 'queryable'],
    ['time', 'theAble'],
  ],

  "words": {
    " ([0-9]+)": [{"id": "count", "initial": "{ value: int(group[0]) }" }],
    " (1[0-2]|[1-9])": [{"id": "hourUnits", "initial": "{ hour: int(group[0]) }" }],
    "am": [{"id": "ampm", "initial": "{ ampm: 'am', determined: true }" }],
    "pm": [{"id": "ampm", "initial": "{ ampm: 'pm', determined: true }" }],
    //" (1[0-2]|[1-9]) ?pm": [{"id": "count", "initial": "{ hour: int(group[0]), part: 'pm' }" }],
    //" (1[0-2]|[1-9]) ?am": [{"id": "count", "initial": "{ hour: int(group[0]), part: 'am' }" }],
    " hours?": [{"id": "timeUnit", "initial": "{ units: 'hour' }" }],
    " minutes?": [{"id": "timeUnit", "initial": "{ units: 'hour' }" }],
    " seconds?": [{"id": "timeUnit", "initial": "{ units: 'seconds' }" }],
  },

  generators: [
    { 
      where: where(),
      match: ({context}) => context.marker == 'ampm' && context.paraphrase, 
      apply: ({g, context}) => `${context.hour.hour} ${context.ampm}` 
    },
    { 
      where: where(),
      match: ({context}) => context.marker == 'time' && context.evalue && context.format == 12, 
      apply: ({g, context}) => {
        let hh = context.evalue.getHours();
        let ampm = 'am'
        if (hh > 12) {
          hh -= 12;
          ampm = 'pm'
        }
        let ss = context.evalue.getMinutes()
        ss = pad(ss, 2)
        return `${hh}:${ss} ${ampm}` 
      }
    },
    { 
      where: where(),
      match: ({context}) => context.marker == 'time' && context.evalue && context.format == 24, 
      apply: ({g, context}) => {
        const pad = (num, size) => {
          num = num.toString();
          while (num.length < size) num = "0" + num;
          return num;
        }

          return `${context.evalue.getHours()}:${pad(context.evalue.getMinutes(), 2)}` 
      }
    },
    { 
      where: where(),
      match: ({context}) => context.marker == 'response', 
      apply: ({g, context}) => context.text 
    },
  ],

  semantics: [
    {
      notes: 'evaluate time',
      where: where(),
      match: ({objects, context, api}) => context.marker == 'time' && context.evaluate, 
      apply: ({objects, context, api}) => {
        context.evalue = api.newDate()
        context.format = objects.format
      }
    },
    {
      notes: 'use time format working case',
      where: where(),
      match: ({objects, context}) => context.marker == 'use' && context.format && (context.format.count == 12 || context.format.count == 24), 
      apply: ({objects, context}) => {
        objects.format = context.format.count
      }
    },
    {
      notes: 'use time format error case',
      where: where(),
      match: ({objects, context}) => context.marker == 'use' && context.format && (context.format.count != 12 && context.format.count != 24), 
      apply: ({objects, context}) => {
        context.marker = 'response'
        context.text = 'The hour format is 12 hour or 24 hour'
      }
    },
  ],
};

config = new Config(config, module)
config.add(tell)
config.api = api
config.initializer( ({config, objects, kms, isModule}) => {
  if (!isModule) {
    kms.time.api.newDate = () => new Date("December 25, 1995 1:59:58 pm" )
  }
  Object.assign(objects, {
    format: 12  // or 24
  });
  config.addSemantic(
      ({context, hierarchy, args}) => context.happening && context.marker == 'is' && args({ types: ['ampm', 'time'], properties: ['one', 'two'] }),
      api.semantics
  )
})

knowledgeModule({
  module,
  description: 'Time related concepts',
  config,
  test: {
    name: './time.test.json',
    contents: time_tests
  },
})
