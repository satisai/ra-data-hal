import nock from 'nock'
import { Resource } from 'halboy'

export const onDiscover = (url, links) =>
  nock(url).get('/')
    .reply(200,
      new Resource()
        .addLinks(links)
        .toObject())

export const onGet = (url, path, queryParams, resource, { headers } = {}) => {
  nock(url, { reqHeaders: headers })
    .get(path)
    .query(queryParams)
    .reply(200, resource.toObject())
}
