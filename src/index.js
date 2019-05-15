import {
  CREATE,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  HttpError,
  UPDATE
} from 'react-admin'
import { assoc, last, path, split } from 'ramda'
import { Navigator } from 'halboy'
import inflection from 'inflection'
import capitalize from 'capitalize'
import qs from 'qs'
import { buildReactAdminParams } from './query'

const log = (request, result) => {
  const { type, resourceName, params } = request

  if (console.group) {
    console.groupCollapsed(type, resourceName, JSON.stringify(params))
    console.log(result)
    console.groupEnd()
  } else {
    console.log('RADataHAL query ', type, resourceName, params)
    console.log('RADataHAL result', result)
  }
}

const getId = id => (id && id.includes(':') ? last(split(':', id)) : id)

const navToResource = async (navigator, method = 'get', ...args) => {
  const resourceResult = await navigator[method](...args)
  const resource = resourceResult.resource()
  const status = resourceResult.status()
  if (status >= 400) {
    const errorContext = resource.getProperty('errorContext')
    const errorMessage =
      path(['problem'], errorContext) ||
      errorContext ||
      'Error has happened creating resource'
    throw new HttpError(errorMessage, status)
  }

  return resource
}

const getSingleResource = async (navigator, resourceName, id) => {
  const resource = await navToResource(
    navigator,
    'get',
    inflection.singularize(resourceName),
    { id: id }
  )

  return resource.toObject()
}

const handleRequest = async (apiUrl, type, resourceName, params) => {
  const discoveryResult = await Navigator.discover(apiUrl)

  switch (type) {
    case GET_LIST: {
      const fullParams = buildReactAdminParams(params)
      const resource = await navToResource(
        discoveryResult,
        'get',
        resourceName,
        fullParams,
        {
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' })
        }
      )
      const total = resource.getProperty(`total${capitalize(resourceName)}`)
      const data = resource.getResource(resourceName).map(r => r.toObject())

      return { data, total }
    }

    case GET_ONE: {
      return {
        data: await getSingleResource(
          discoveryResult,
          resourceName,
          getId(params.id)
        )
      }
    }

    case CREATE: {
      const body = assoc('id', getId(path(['data', 'id'], params)), params.data)
      const resource = await navToResource(
        discoveryResult,
        'post',
        resourceName,
        body,
        body
      )
      const data = resource.toObject()

      return { data }
    }

    case GET_MANY: {
      const ids = params.ids.map(getId)

      const data = await Promise.all(
        ids.map(id => getSingleResource(discoveryResult, resourceName, id))
      )

      return { data, total: data.length }
    }

    case GET_MANY_REFERENCE: {
      const resource = await navToResource(
        discoveryResult,
        'get',
        resourceName,
        {
          ...buildReactAdminParams(params),
          [params.target]: params.id
        },
        {
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' })
        }
      )
      const data = resource
        .getResource(resourceName)
        .map(resource => resource.toObject())

      const total = resource.getProperty(`total${capitalize(resourceName)}`)

      return { data, total }
    }

    case UPDATE: {
      const body = assoc('id', getId(path(['data', 'id'], params)), params.data)
      const resource = await navToResource(
        discoveryResult,
        'put',
        inflection.singularize(resourceName),
        body,
        body
      )
      const data = resource.toObject()

      return { data }
    }

    default:
      throw new Error(`Unsupported fetch action type ${type}`)
  }
}

export default (apiUrl, { debug = false } = {}) => {
  return async (type, resourceName, params) => {
    let response

    try {
      response = await handleRequest(apiUrl, type, resourceName, params)
    } catch (error) {
      debug && log({ type, resourceName, params }, error)
      throw error
    }

    debug && log({ type, resourceName, params }, response)

    return response
  }
}
