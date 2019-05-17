import { expect } from 'chai'
import { buildFilterParams } from '../src/query'

describe('query param builders', () => {
  describe('buildFilterParams', () => {
    it('converts the filter object to key-value pairs', () => {
      const filter = {
        first: '1',
        second: '2'
      }

      const filterParams = buildFilterParams(filter)

      expect(filterParams).to.eql({
        filter: ['["first","1"]', '["second","2"]']
      })
    })

    it('converts nested filter object to sourcestring-value pairs', () => {
      const filter = {
        first: {
          second: '2'
        },
        third: {
          fourth: '4'
        }
      }

      const filterParams = buildFilterParams(filter)

      expect(filterParams).to.eql({
        filter: ['["first.second","2"]', '["third.fourth","4"]']
      })
    })
  })
})
