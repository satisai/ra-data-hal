import {
  CREATE,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  UPDATE,
  DELETE,
  HttpError
} from 'react-admin'
import { assoc, last, mergeRight, path, split } from 'ramda'
import { Navigator } from 'halboy'
import inflection from 'inflection'
import qs from 'qs'
import { buildHeaders, buildReactAdminParams } from './query'

const capitalizeFirstLetter = string =>
  string.charAt(0).toUpperCase() + string.slice(1)

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

const navToResult = async (navigator, method = 'get', ...args) => {
  const resourceResult = await navigator[method](...args)

  const status = resourceResult.status()
  if (status >= 400) {
    const resource = resourceResult.resource()
    const errorContext = resource.getProperty('errorContext')
    const errorMessage =
      path(['problem'], errorContext) ||
      errorContext ||
      'Error has happened creating resource'
    throw new HttpError(errorMessage, status)
  }

  return resourceResult
}

const getSingleResult = async (navigator, resourceName, id, ...args) => {
  return navToResult(
    navigator,
    'get',
    inflection.singularize(resourceName),
    id,
    ...args
  )
}

const navToResource = async (navigator, method = 'get', ...args) => {
  return (await navToResult(navigator, method, ...args)).resource()
}

const getSingleResource = async (navigator, resourceName, id, ...args) => {
  return (await getSingleResult(
    navigator,
    resourceName,
    id,
    ...args
  )).resource()
}

const handleRequest = async (
  apiUrl,
  type,
  resourceName,
  params,
  globals = {}
) => {
  let headers = mergeRight(params.headers, globals.headers)
  let headerOptions = {
    ...buildHeaders(headers)
  }

  const discoveryResult = await Navigator.discover(apiUrl, {
    http: { ...headerOptions }
  })

  switch (type) {
    case GET_LIST: {
      const fullParams = buildReactAdminParams(params)
      const resource = await navToResource(
        discoveryResult,
        'get',
        resourceName,
        fullParams,
        {
          ...headerOptions,
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' })
        }
      )
      const total = resource.getProperty(
        `total${capitalizeFirstLetter(resourceName)}`
      )
      const data = resource.getResource(resourceName).map(r => r.toObject())

      return { data, total }
    }

    case GET_ONE: {
      return {
        data: (await getSingleResource(
          discoveryResult,
          resourceName,
          { id: getId(params.id) },
          { ...headerOptions }
        )).toObject()
      }
    }

    case CREATE: {
      const body = assoc('id', getId(path(['data', 'id'], params)), params.data)
      const resource = await navToResource(
        discoveryResult,
        'post',
        resourceName,
        body,
        body,
        headerOptions
      )
      const data = resource.toObject()

      return { data }
    }

    case GET_MANY: {
      const ids = params.ids.map(getId)

      const data = await Promise.all(
        ids.map(async id =>
          (await getSingleResource(
            discoveryResult,
            resourceName,
            { id },
            { ...headerOptions }
          )).toObject()
        )
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
          ...headerOptions,
          paramsSerializer: params =>
            qs.stringify(params, { arrayFormat: 'repeat' })
        }
      )
      const data = resource
        .getResource(resourceName)
        .map(resource => resource.toObject())

      const total = resource.getProperty(
        `total${capitalizeFirstLetter(resourceName)}`
      )

      return { data, total }
    }

    case UPDATE: {
      const body = assoc('id', getId(path(['data', 'id'], params)), params.data)
      const resource = await navToResource(
        discoveryResult,
        'put',
        inflection.singularize(resourceName),
        body,
        body,
        headerOptions
      )
      const data = resource.toObject()

      return { data }
    }

    case DELETE: {
      const getResult = await getSingleResult(
        discoveryResult,
        inflection.singularize(resourceName),
        { id: getId(params.id) },
        { ...headerOptions }
      )
      const data = getResult.resource().toObject()

      await getResult.delete('self', null, {}, headerOptions)

      return { data: data }
    }

    default:
      throw new Error(`Unsupported fetch action type ${type}`)
  }
}

export default (apiUrl, { debug = false, ...globals } = {}) => {
  return async (type, resourceName, params) => {
    let response
    try {
      response = await handleRequest(
        apiUrl,
        type,
        resourceName,
        params,
        globals
      )
    } catch (error) {
      debug && log({ type, resourceName, params }, error)
      throw error
    }

    debug && log({ type, resourceName, params }, response)

    return response
  }
}
