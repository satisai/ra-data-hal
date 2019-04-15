import { append, reduce, toPairs } from 'ramda'

const buildPaginationParams = (pagination) => {
  if (pagination && pagination.page && pagination.perPage) {
    return {
      page: pagination.page,
      perPage: pagination.perPage
    }
  }

  return {}
}

const buildSortParams = (sort) => {
  if (sort && sort.field && sort.order) {
    return {
      sort: JSON.stringify([sort.field, sort.order.toLowerCase()])
    }
  }

  return {}
}

const buildFilterParams = (filter) => ({
  filter: reduce((filters, [field, value]) => {
    return append(JSON.stringify([field, value]), filters)
  }, [], toPairs(filter))
})

export const buildReactAdminParams = ({ pagination, sort, filter }) => ({
  ...buildPaginationParams(pagination),
  ...buildSortParams(sort),
  ...buildFilterParams(filter)
})
