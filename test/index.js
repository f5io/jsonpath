import test from 'tape';
import query from '../src';

const data = require('./data.json');

const getTime = () => {
  const hr = process.hrtime();
  return (hr[0] * 1e9 + hr[1]) / 1e6;
};

const measure = (name, fn, ...args) => {
  const before = getTime();
  const result = fn(...args);
  const after = getTime();
  console.log(`${name} took: ${after - before}ms`);
  return result;
};

const runQueries = (test, queries, expected) => {
  test.plan(queries.length);
  queries.forEach(q => {
    const qy = measure(`parse: '${q}'`, query, q);
    const result = measure(`query: '${q}'`, qy, data);
    test.deepEquals(result, expected, `'${q}' should return expected results`);
  });
};

test('get root', t => {
  const expected = data;
  const queries = [
    '$'
  ];
  runQueries(t, queries, expected);
});

test('get wildcard', t => {
  const expected = data.store;
  const queries = [
    '$.store.*'
  ];
  runQueries(t, queries, expected);
});

test('get expr', t => {
  const expected = data.store.book[3];
  const queries = [
    '$..book[(@.length-1)]'
  ];
  runQueries(t, queries, expected);
});

test('get fexpr', t => {
  const expected = data.store.book.filter(x => x.price > 20);
  const queries = [
    '$..book[?(@.price > 20)]'
  ];
  runQueries(t, queries, expected);
});

test('get mexpr', t => {
  const expected = data.store.book.map(x => x.title);
  const queries = [
    '$..book[!(@.title)]'
  ];
  runQueries(t, queries, expected);
});

test('get coerce/mexpr', t => {
  const expected = data.store.book.map(x => String(x.price));
  const queries = [
    '$..book[!(String(@.price))]',
    '$..book.price<String>'
  ];
  runQueries(t, queries, expected);
});

test('get slice/union', t => {
  const expected = data.store.book.slice(1, 4);
  const queries = [
    '$..book[1:4]',
    '$..book[1,2,3]'
  ];
  runQueries(t, queries, expected);
});

test('get all authors', t => {
  const expected = [ 'Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien' ];
  const queries = [
    '$..book.author',
    '$..author'
  ];
  runQueries(t, queries, expected);
});

test('get specific author', t => {
  const expected = [ 'Nigel Rees' ];
  const queries = [
    '$..book.0.author',
    '$..book[?(@.price === 8.95)].author',
    '$..author[?(@.startsWith("Nigel"))]',
    '$.store.book[0].author'
  ];
  runQueries(t, queries, expected);
});

test('get specific author, title', t => {
  const expected = [
    [ 'Nigel Rees', 'Sayings of the Century' ],
    [ 'Herman Melville', 'Moby Dick' ]
  ];
  const queries = [
    '$..book[?(@.price < 10)]["author","title"]',
    '$..book[?(@.title.toLowerCase().indexOf("c") > -1)]["author","title"]',
  ];
  runQueries(t, queries, expected);
});

test('get specific author, title as object', t => {
  const expected = [
    {
      author: "Nigel Rees",
      title: "Sayings of the Century"
    },
    {
      author: "Herman Melville",
      title: "Moby Dick"
    }
  ];
  const queries = [
    '$..book[?(@.price < 10)]{"author","title"}',
    '$..book[?(@.title.toLowerCase().indexOf("c") > -1)]{"author","title"}',
  ];
  runQueries(t, queries, expected);
});