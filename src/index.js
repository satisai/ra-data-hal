import {
  CREATE,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE
} from 'react-admin'
import {
  append,
  assoc,
  last,
  path,
  reduce,
  split,
  toPairs
} from 'ramda'
import { Navigator } from 'halboy'
import inflection from 'inflection'
import capitalize from 'capitalize'
import qs from 'qs'

const getId = (id) => id && id.includes(':')
  ? last(split(':', id))
  : id

const getSingleResource = async (navigator, resourceName, id) => {
  const result = await navigator.get(
    inflection.singularize(resourceName),
    { id: id }
  )

  const resource = result.resource()
  return {
    ...resource.getProperties(),
    links: resource.links,
    embedded: resource.embedded
  }
}

export default (apiUrl) => {
  /**
   * Query a data provider and return a promise for a
   * response
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
              return qs.stringify(params, { arrayFormat: 'repeat' })
            }
          })
        const resource = resourceResult.resource()
        const total = resource.getProperty(`total${capitalize(resourceName)}`)
        const data = resource.getResource(resourceName)
          .map(r => ({
            ...r.getProperties(),
            links: r.links,
            embedded: r.embedded
          }))

        return { data, total }
      }

      case GET_ONE: {
        return {
          data: await getSingleResource(
            discoveryResult,
            resourceName,
            getId(params.id))
        }
      }

      case CREATE: {
        const body = assoc('id', getId(path(['data', 'id'], params)), params.data)
        const resourceResult = await
          discoveryResult.post(resourceName, body, body)
        const resource = resourceResult.resource()
        if (resourceResult.status() >= 400) {
          const errorMessage = resource.getProperty('errorContext').problem ||
            resource.getProperty('errorContext') ||
            'Error has happened creating resource'
          throw new Error(errorMessage)
        }
        const data = {
          ...resource.getProperties(),
          links: resource.links,
          embedded: resource.embedded
        }

        return { data }
      }

      case GET_MANY: {
        const ids = params.ids.map(getId)
        const data = await Promise.all(ids.map(id =>
          getSingleResource(discoveryResult, resourceName, id)))

        return { data, total: data.length }
      }

      case GET_MANY_REFERENCE: {
        const query = {
          [params.target]: params.id
        }
        const resourceResult = await
          discoveryResult.get(resourceName, query)
        const resource = resourceResult.resource()
        const data = resource.getResource(resourceName)
          .map(resource => ({
            ...resource.getProperties(),
            links: resource.links,
            embedded: resource.embedded
          }))

        return { data, total: data.length }
      }

      default:
        throw new Error(`Unsupported fetch action type ${type}`)
    }
  }
}
