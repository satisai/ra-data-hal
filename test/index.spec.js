import { expect } from 'chai'
import faker from 'faker'
import nock from 'nock'
import qs from 'qs'
import { Resource } from 'halboy'
import {
  CREATE,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  UPDATE
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
          qs.stringify(expectedQueryParams, { arrayFormat: 'repeat' })

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
            },
            embedded: {}
          },
          {
            id: post2Resource.getProperty('id'),
            title: post2Resource.getProperty('title'),
            author: post2Resource.getProperty('author'),
            active: post2Resource.getProperty('active'),
            tag: post2Resource.getProperty('tag'),
            links: {
              self: { href: post2Resource.getHref('self') }
            },
            embedded: {}
          }
        ],
        total: 36
      })
    })
  })

  describe('on GET_ONE', () => {
    it('fetches the resource by ID based on discovery',
      async () => {
        const apiUrl = faker.internet.url()
        const postId = faker.random.uuid()

        const postResource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}`
          })
          .addProperties({
            id: postId,
            title: 'My first post',
            author: 'Jenny',
            active: true,
            tag: 'article'
          })

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          post: {
            href: `${apiUrl}/posts/{id}`,
            templated: true
          }
        })

        api.onGet(apiUrl, `/posts/${postId}`, postResource)

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(GET_ONE, 'posts', {
          id: postId
        })

        expect(result).to.eql({
          data: {
            id: postResource.getProperty('id'),
            title: postResource.getProperty('title'),
            author: postResource.getProperty('author'),
            active: postResource.getProperty('active'),
            tag: postResource.getProperty('tag'),
            links: {
              self: { href: postResource.getHref('self') }
            },
            embedded: {}
          }
        })
      })
  })

  describe('on CREATE', () => {
    it('posts to resource based on discovery',
      async () => {
        const apiUrl = faker.internet.url()
        const postId = faker.random.uuid()
        const commentId = faker.random.uuid()

        const commentResource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}/comments/${commentId}`
          })
          .addProperties({
            id: commentId,
            title: 'My Comment',
            body: 'Best comment ever'
          })

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          post: {
            href: `${apiUrl}/posts/{id}`,
            templated: true
          },
          postComments: {
            href: `${apiUrl}/posts/{id}/comments`,
            templated: true
          }
        })

        const payload = {
          id: postId,
          title: 'My Comment',
          body: 'Best comment ever'
        }
        api.onPost(apiUrl, `/posts/${postId}/comments`, payload, commentResource)

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(CREATE, 'postComments',
          {
            data: payload
          })

        expect(result).to.eql({
          data: {
            id: commentResource.getProperty('id'),
            title: commentResource.getProperty('title'),
            body: commentResource.getProperty('body'),
            links: {
              self: { href: commentResource.getHref('self') }
            },
            embedded: {}
          }
        })
      })

    it('throws exception when response does not have 2xx status',
      async () => {
        const apiUrl = faker.internet.url()
        const postId = faker.random.uuid()
        const commentId = faker.random.uuid()

        const errorResource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}/comments/${commentId}`
          })
          .addProperties({
            errorContext: { problem: 'Bad things happen too' }
          })

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          post: {
            href: `${apiUrl}/posts/{id}`,
            templated: true
          },
          postComments: {
            href: `${apiUrl}/posts/{id}/comments`,
            templated: true
          }
        })

        const payload = {
          id: postId,
          title: 'My Comment',
          body: 'Best comment ever'
        }
        api.onPost(apiUrl, `/posts/${postId}/comments`, payload, errorResource, 422)

        const dataProvider = halDataProvider(apiUrl)

        await dataProvider(CREATE, 'postComments',
          {
            data: payload
          }).catch(err => {
          expect(() => {
            throw err
          }).to.throw('Bad things happen too')
        })
      })
  })

  describe('on GET_MANY', () => {
    it('fetches many',
      async () => {
        const apiUrl = faker.internet.url()

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          comment: {
            href: `${apiUrl}/comments/{id}`,
            templated: true
          }
        })

        const commentId1 = faker.random.uuid()
        const commentResource1 = new Resource()
          .addLinks({
            self: `${apiUrl}/comments/${commentId1}`
          })
          .addProperties({
            id: commentId1,
            title: 'My comment',
            body: 'Best comment ever'
          })

        api.onGet(
          apiUrl,
          `/comments/${commentId1}`,
          commentResource1)

        const commentId2 = faker.random.uuid()
        const commentResource2 = new Resource()
          .addLinks({
            self: `${apiUrl}/comments/${commentId2}`
          })
          .addProperties({
            id: commentId2,
            title: 'My other comment',
            body: 'Second best comment ever'
          })

        api.onGet(
          apiUrl,
          `/comments/${commentId2}`,
          commentResource2)

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(GET_MANY, 'comments', {
          ids: [commentId1, commentId2]
        })

        expect(result).to.eql({
          data: [{
            links: commentResource1.links,
            embedded: {},
            id: commentResource1.getProperty('id'),
            title: commentResource1.getProperty('title'),
            body: commentResource1.getProperty('body')
          }, {
            links: commentResource2.links,
            embedded: {},
            id: commentResource2.getProperty('id'),
            title: commentResource2.getProperty('title'),
            body: commentResource2.getProperty('body')
          }],
          total: 2
        })
      })
  })

  describe('on GET_MANY_REFERENCE', () => {
    it('fetches many by reference',
      async () => {
        const apiUrl = faker.internet.url()
        const postId = faker.random.uuid()
        const target = 'post'

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          comments: {
            href: `${apiUrl}/comments{?post}`,
            templated: true
          }
        })

        const commentId1 = faker.random.uuid()
        const commentResource1 = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}/comments/${commentId1}`
          })
          .addProperties({
            id: commentId1,
            title: 'My comment',
            body: 'Best comment ever'
          })

        const commentId2 = faker.random.uuid()
        const commentResource2 = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}/comments/${commentId2}`
          })
          .addProperties({
            id: commentId2,
            title: 'My other comment',
            body: 'Second best comment ever'
          })

        const commentsResource = new Resource()
          .addResource('comments', [commentResource1, commentResource2])

        api.onGet(apiUrl, `/comments?${target}=${postId}`, commentsResource)

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(GET_MANY_REFERENCE, 'comments', {
          target,
          id: postId
        })

        expect(result).to.eql({
          data: [{
            links: commentResource1.links,
            embedded: {},
            id: commentResource1.getProperty('id'),
            title: commentResource1.getProperty('title'),
            body: commentResource1.getProperty('body')
          }, {
            links: commentResource2.links,
            embedded: {},
            id: commentResource2.getProperty('id'),
            title: commentResource2.getProperty('title'),
            body: commentResource2.getProperty('body')
          }],
          total: 2
        })
      })
  })

  describe('on UPDATE', () => {
    it('updates the resource based on discovery',
      async () => {
        const apiUrl = faker.internet.url()
        const postId = faker.random.uuid()

        const payload = {
          id: postId,
          title: 'My Comment',
          body: 'Best comment ever'
        }

        const putResource = new Resource()
          .addLinks({
            self: `${apiUrl}/posts/${postId}`
          })
          .addProperties({
            id: payload.id,
            title: payload.title,
            body: payload.body
          })

        api.onDiscover(apiUrl, {
          self: `${apiUrl}/`,
          post: {
            href: `${apiUrl}/posts/{id}`,
            templated: true
          }
        })

        api.onPut(apiUrl, `/posts/${postId}`, payload, putResource)

        const dataProvider = halDataProvider(apiUrl)

        const result = await dataProvider(UPDATE, 'posts', {
          data: payload
        })

        expect(result).to.eql({
          data: {
            id: payload.id,
            title: payload.title,
            body: payload.body,
            links: {
              self: { href: putResource.getHref('self') }
            },
            embedded: {}
          }
        })
      })
  })
})
