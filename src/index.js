import {
  GET_LIST
} from 'react-admin'
import {
  Navigator
} from 'halboy'
import capitalize from 'capitalize'
import { reduce, toPairs, append } from 'ramda'
import qs from 'qs'

export default (apiUrl) => {
  /**
   * Query a data provider and return a promise for a response
   *
   * @example
   * dataProvider(GET_ONE, 'posts', { id: 123 })
   *  => Promise.resolve({ data: { id: 123, title: "hello, world!" } })
   *
   * @param {string} type Request type, e.g. GET_LIST.
   * @param {string} resource Resource name, e.g. "posts".
   * @param {Object} params Request parameters. Depends on the action type.
   * @returns {Promise} the Promise for a response.
   */
  return async (type, resourceName, params) => {
    const discoveryResult = await Navigator.discover(apiUrl)

    switch (type) {
      case GET_LIST: {
        const {
          pagination: { page, perPage },
          sort: { field, order },
          filter
        } = params

        const paginationParams = {
          'page': page,
          'perPage': perPage
        }
        const sortParams = {
          'sort': JSON.stringify([field, order.toLowerCase()])
        }
        const filterParams = {
          'filter': reduce((filters, [field, value]) => {
            return append(JSON.stringify([field, value]), filters)
          }, [], toPairs(filter))
        }
        const fullParams = {
          ...paginationParams,
          ...sortParams,
          ...filterParams
        }
        const resourceResult = await
          discoveryResult.get(resourceName, fullParams, {
            paramsSerializer: (params) => {
              return qs.stringify(params, {arrayFormat: 'repeat'})
            }
          })
        const resource = resourceResult.resource()
        const total = resource.getProperty(`total${capitalize(resourceName)}`)
        const data = resource.getResource(resourceName)
          .map(r => ({
            ...r.getProperties(),
            links: r.links,
          }))

        return { data, total }
      }
      default:
        throw new Error(`Unsupported fetch action type ${type}`)
    }
  }
}
