import { append, call, keys, reduce, toPairs } from 'ramda'

// Taken from https://gist.github.com/penguinboy/762197
const flatten = (object, prefix = '') => {
  return Object.keys(object).reduce((prev, element) => {
    return object[element] &&
      typeof object[element] === 'object' &&
      !Array.isArray(element)
      ? { ...prev, ...flatten(object[element], `${prefix}${element}.`) }
      : { ...prev, ...{ [`${prefix}${element}`]: object[element] } }
  }, {})
}

export const buildPaginationParams = pagination => {
  if (pagination && pagination.page && pagination.perPage) {
    return {
      offset: (pagination.page - 1) * pagination.perPage,
      limit: pagination.perPage
    }
  }

  return {}
}

export const buildSortParams = sort => {
  if (sort && sort.field && sort.order) {
    return {
      sort: JSON.stringify([sort.field, sort.order.toLowerCase()])
    }
  }

  return {}
}

export const buildFilterParams = filter => ({
  filter: filter
    ? reduce(
        (filters, [field, value]) => {
          return append(JSON.stringify([field, value]), filters)
        },
        [],
        toPairs(flatten(filter))
      )
    : []
})

export const buildHeaders = (headers = {}) => ({
  headers: reduce(
    (acc, key) => {
      let val = headers[key]
      if (val instanceof Function) {
        acc[key] = call(val)
      } else {
        acc[key] = val
      }
      return acc
    },
    {},
    keys(headers)
  )
})

export const buildReactAdminParams = ({ pagination, sort, filter }) => ({
  ...buildPaginationParams(pagination),
  // ...buildSortParams(sort),
  ...buildFilterParams(filter)
})
