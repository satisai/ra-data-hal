import {
  GET_LIST
} from 'react-admin'
import {
  Navigator
} from 'halboy'
import capitalize from 'capitalize'

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
          sort: { field, order }
        } = params

        const paginationParams = {
          'page': page,
          'perPage': perPage
        }
        const sortParams = {
          'sort': JSON.stringify([field, order.toLowerCase()])
        }
        const resourceResult = await discoveryResult.get(resourceName, {
          ...paginationParams,
          ...sortParams
        })
        const resource = resourceResult.resource()
        const total = resource.getProperty(`total${capitalize(resourceName)}`)
        const data = resource.getResource(resourceName)
          .map(r => ({
            id: r.getHref('self'),
            ...r.getProperties()
          }))

        return { data, total }
      }
      default:
        throw new Error(`Unsupported fetch action type ${type}`)
    }
  }
}
