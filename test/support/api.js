import nock from 'nock'
import { Resource } from 'halboy'
import qs from 'qs'

export const onDiscover = (url, links, { headers, badheaders } = {}) =>
  nock(url, {
    reqheaders: headers,
    badheaders: badheaders
  })
    .get('/')
    .reply(200, new Resource().addLinks(links).toObject())

export const onGet = (url, path, resource, { headers, badheaders } = {}) => {
  nock(url, {
    reqheaders: headers,
    badheaders: badheaders,
    paramsSerializer: params => {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
    .get(path)
    .reply(200, resource.toObject())
}

export const onPost = (
  url,
  path,
  body,
  resource,
  status = 200,
  { headers } = {}
) => {
  nock(url, {
    reqheaders: headers,
    paramsSerializer: params => {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
    .post(path, body)
    .reply(status, resource.toObject())
}

export const onPut = (
  url,
  path,
  body,
  resource,
  status = 200,
  { headers } = {}
) => {
  nock(url, {
    reqheaders: headers,
    paramsSerializer: params => {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
    .put(path, body)
    .reply(status, resource.toObject())
}

export const onDelete = (url, path, status = 200, { headers } = {}) => {
  nock(url, {
    reqheaders: headers,
    paramsSerializer: params => {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
    .matchHeader('foo', 'bar')
    .delete(path)
    .reply(status)
}
