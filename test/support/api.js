import nock from 'nock'
import { Resource } from 'halboy'
import qs from 'qs'

export const onDiscover = (url, links) =>
  nock(url).get('/')
    .reply(200,
      new Resource()
        .addLinks(links)
        .toObject())

export const onGet = (url, path, resource, {headers} = {}) => {
  nock(url, {
    reqHeaders: headers,
    paramsSerializer: (params) => {
      return qs.stringify(params, {arrayFormat: 'repeat'})
    }
  })
    .get(path)
    .reply(200, resource.toObject())
}
