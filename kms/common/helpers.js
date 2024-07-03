const pluralize = require('pluralize')

// X pm today or tomorrow
const millisecondsUntilHourOfDay = (newDate, hour) => {
  const now = newDate()
  const target = newDate(now)

  const addHours = (date, h) => {
    date.setTime(date.getTime() + (h*60*60*1000));
  }
  const hours = target.getHours()
  if (hours == hour) {
    return 0
  }
  if (hours > hour) {
    addHours(target, 24)
  }
  target.setHours(hour, 0, 0, 0)
  var diff = Math.abs(target - now);
  return diff;
}

const indent = (string, indent) => {
  return string.replace(/^/gm, ' '.repeat(indent));
}

const isMany = (context) => {
  if (((context || {}).value || {}).marker == 'list' && (((context || {}).value || {}).value || []).length > 1) {
    return true
  }

  let number = context.number
  if (context.quantity) {
    if (context.quantity.number) {
      number = context.quantity.number
    } else if (context.quantity.value !== 1) {
      number = 'many'
    }
  }

  if (number == 'many') {
    return true
  }
  if (number == 'one') {
    return false
  }
  if (context.word && pluralize.isPlural(context.word)) {
    return true
  }
  return false
}

const chooseNumber = (context, one, many) => {
  if (isMany(context)) {
    return many;
  } else {
    return one;
  }
}

const zip = (...arrays) => {
  if (arrays == []) {
    return []
  }
  const zipped = []
  for(let i = 0; i < arrays[0].length; i++){
    let tuple = []
    for (const array of arrays) {
      tuple.push(array[i])
    }
    zipped.push(tuple)
  }
  return zipped
}


const focus = (context) => {
  const helper = (context) => {
    if (!context || !context.focusable) {
      return null
    }
    for (const property of context.focusable) {
      let focus = helper(context[property])
      if (!focus && (context[property] || {}).focus) {
        focus = context[property]
      }
      return focus
    }
    return null
  }
  return helper(context) || context
}

// if property is a list make array of elements of the list, if not return an array with the property value
// fromList
const propertyToArray = (value) => {
  if (Array.isArray(value)) {
    return value
  } else if (value.marker == 'list') {
    return value.value
  } else {
    return [value]
  }
}

wordNumber = (word, toPlural) => {
  if (toPlural) {
    return pluralize.plural(word)
  } else {
    return pluralize.singular(word)
  }
}

const toEValue = (context) => {
  while( context.evalue ) {
    context = context.evalue
  }
	return context;
}

const defaultContextProperties = ['marker', 'text', 'verbatim', 'isResponse'] 
const defaultContextCheck = [
  ...defaultContextProperties,
  (object) => {
    if (typeof object.value == 'object') {
      return { property: 'value', filter: defaultContextProperties }
    } else {
      return 'value'
    }
  },
  (object) => {
    if (!Array.isArray(object.modifiers)) {
      return
    }
    if (typeof object.modifiers[0] == 'object') {
      return { property: 'modifiers', filter: defaultContextProperties }
    } else {
      return 'modifiers'
    }
  },
  { property: 'modifiers', isPropertyList: true, filter: defaultContextProperties }
]

module.exports = {
  defaultContextCheck,
	toEValue,
  millisecondsUntilHourOfDay,
  indent,
  isMany,
  chooseNumber,
  zip,
  focus,
  propertyToArray,
  wordNumber,
}
