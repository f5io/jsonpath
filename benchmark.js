import query from './src';
import JSONPath from 'jsonpath-plus';
import jp from 'jsonpath';
import Benchmark from 'benchmark';
import { deepEqual } from 'assert';

const data = require('./test/data.json');

const queries = [
  {
    expected: [ 'Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien' ],
    queries: [
      '$..author'
    ]
  },
  {
    expected: [ 'Nigel Rees' ],
    queries: [
      '$..book.0.author',
      '$..book[?(@.price === 8.95)].author',
      '$.store.book[0].author'
    ]
  }
];

let result;
queries.forEach(({ expected, queries }) => {
  queries.forEach(q => {
    new Benchmark.Suite()
      .add(`@f5io/jsonpath #~ ${q}`, () => (result = query(q, data)))
      .add(`jsonpath-plus #~ ${q}`, () => (result = JSONPath({ json: data, path: q })))
      .add(`jsonpath #~ ${q}`, () => (result = jp.query(data, q)))
      .on('error', console.error.bind(console))
      .on('cycle', function(event) {
        deepEqual(result, expected, 'should return the expected results');
        console.log(String(event.target));
      })
      .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
      })
      .run();
  });
});