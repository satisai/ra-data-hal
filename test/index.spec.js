import { expect } from 'chai'
import faker from 'faker'
import nock from 'nock'
import qs from 'qs'
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
    it('fetches the resource based on discovery with pagination, sort ' +
      'and filter query parameters',
    async () => {
      const apiUrl = faker.internet.url()
      const page = 3
      const perPage = 2
      const sortField = 'title'
      const sortOrder = 'asc'
      const filterField1 = 'active'
      const filterValue1 = 'true'
      const filterField2 = 'tag'
      const filterValue2 = 'article'


      const post1Id = faker.random.uuid()
      const post1Resource = new Resource()
        .addLinks({
          self: `${apiUrl}/posts/${post1Id}`
        })
        .addProperties({
          id: post1Id,
          title: 'My first post',
          author: 'Jenny',
          active: true,
          tag: 'article'
        })

      const post2Id = faker.random.uuid()
      const post2Resource = new Resource()
        .addLinks({
          self: `${apiUrl}/posts/${post2Id}`
        })
        .addProperties({
          id: post2Id,
          title: 'My second post',
          author: 'James',
          active: true,
          tag: 'article'
        })

      const expectedQueryParams = {
        page,
        perPage,
        sort: `["${sortField}","${sortOrder}"]`,
        filter: [
          `["${filterField1}","${filterValue1}"]`,
          `["${filterField2}","${filterValue2}"]`
        ]
      }
      const expectedQueryString =
        qs.stringify(expectedQueryParams, {arrayFormat: 'repeat'})

      api.onDiscover(apiUrl, {
        self: `${apiUrl}/`,
        posts: {
          href: `${apiUrl}/posts{?page,perPage,sort*,filter*}`,
          templated: true
        }
      })

      api.onGet(
        apiUrl, `/posts?${expectedQueryString}`,
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
        sort: { field: sortField, order: sortOrder },
        filter: {
          [filterField1]: filterValue1,
          [filterField2]: filterValue2
        }
      })

      expect(result).to.eql({
        data: [
          {
            id: post1Resource.getProperty('id'),
            title: post1Resource.getProperty('title'),
            author: post1Resource.getProperty('author'),
            active: post1Resource.getProperty('active'),
            tag: post1Resource.getProperty('tag'),
            links: {
              self: { href: post1Resource.getHref('self') }
            }
          },
          {
            id: post2Resource.getProperty('id'),
            title: post2Resource.getProperty('title'),
            author: post2Resource.getProperty('author'),
            active: post2Resource.getProperty('active'),
            tag: post2Resource.getProperty('tag'),
            links: {
              self: { href: post2Resource.getHref('self') }
            }
          }
        ],
        total: 36
      })
    })
  })
})
