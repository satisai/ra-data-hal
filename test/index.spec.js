import { expect } from 'chai'
import faker from 'faker'
import nock from 'nock'
import { Resource } from 'halboy'
import {
  GET_LIST
} from 'react-admin'

import * as api from './support/api'

import halDataProvider from '../src/index'

describe('react-admin HAL data provider', () => {
  beforeEach(() => {
    nock.cleanAll()
  })

  describe('on GET_LIST', () => {
    it('fetches the resource based on discovery with pagination and sort ' +
      'query parameters',
      async () => {
        const apiUrl = faker.internet.url()
        const page = 3
        const perPage = 2
        const field = 'title'
        const order = 'asc'

        const post1Resource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${faker.random.uuid()}`
          })
          .addProperties({
            title: 'My first post',
            author: 'Jenny'
          })

        const post2Resource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${faker.random.uuid()}`
          })
          .addProperties({
            title: 'My second post',
            author: 'James'
          })

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          posts: {
            href: `${apiUrl}/posts{?page,perPage,sort*}`,
            templated: true
          }
        })

        api.onGet(
          apiUrl, `/posts`, {
            page,
            perPage,
            sort: `["${field}","${order}"]`
          },
          new Resource()
            .addLinks({
              self: {
                href: `/posts`
              }
            })
            .addProperty('totalPosts', 36)
            .addResource('posts', post1Resource)
            .addResource('posts', post2Resource))

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(GET_LIST, 'posts', {
          pagination: { page, perPage },
          sort: { field, order },
        })

        expect(result).to.eql({
          data: [
            {
              id: post1Resource.getHref('self'),
              title: post1Resource.getProperty('title'),
              author: post1Resource.getProperty('author')
            },
            {
              id: post2Resource.getHref('self'),
              title: post2Resource.getProperty('title'),
              author: post2Resource.getProperty('author')
            }
          ],
          total: 36
        })
      })
  })
})
