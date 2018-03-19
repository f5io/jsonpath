import test from 'tape';
import query, { paths } from '../src';
import tokenizer from '../src/tokenizer';
import parser from '../src/parser';
import maybe from '../src/maybe';
import { isPlainObject, isObject } from '../src/utils';

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

const runQueries = (test, queries, expected, d = data) => {
  queries.forEach(q => {
    const qy = measure(`parse: '${q}'`, query, q);
    const result = measure(`query: '${q}'`, qy, d);
    test.deepEquals(result, expected, `'${q}' should return expected results`);
  });
};

const runPaths = (test, queries, expected, d = data) => {
  queries.forEach(q => {
    const result = measure(`paths: '${q}'`, paths, q, d);
    test.deepEquals(result, expected, `'${q}' should return expected paths`);
  });
};

test('tokenizer', t => {
  t.plan(1);
  t.throws(() => tokenizer('@'), /Found no matching rule: @/, 'should throw an error');
});

test('parser', t => {
  t.plan(1);
  t.throws(() => parser([ { type: 'foo' } ]), /Unknown token type: foo/, 'should throw an error');
});

test('maybe', t => {
  t.plan(6);
  const m1 = maybe(3);
  const m2 = maybe();
  const plusOne = x => x + 1;
  const timesTwo = x => x * 2;
  const or = 'foo';
  t.equal(4, m1.bind(plusOne), 'should return the value inside');
  t.equal(6, m1.map(timesTwo).get(), 'should return the value wrapped');
  t.equal(6, m1.map(timesTwo).getOr(or), 'should return the value wrapped');
  t.equal(m2, m2.bind(timesTwo), 'should return the same instance');
  t.equal(m2, m2.map(plusOne), 'should return the same instance');
  t.equal(or, m2.map(plusOne).getOr(or), 'should return the value provided');

});

test('isPlainObject - constructor not a function', t => {
  t.plan(1);
  const obj = { constructor: 'wot' };
  t.notOk(isPlainObject(obj), 'should return false');
});

test('isPlainObject - constructor null prototype', t => {
  t.plan(1);
  function f() {}
  f.prototype = null;
  const obj = { constructor: f };
  t.notOk(isPlainObject(obj), 'should return false');
});

test('isPlainObject - constructor no isPrototypeOf', t => {
  t.plan(1);
  function f() {}
  delete f.prototype.isPrototypeOf;
  const obj = { constructor: f };
  t.notOk(isPlainObject(obj), 'should return false');
});

test('isObject', t => {
  t.plan(2);
  t.notOk(isObject(2), 'should return false');
  t.ok(isObject({}), 'should return true');
});

test('cached queries', t => {
  const expected = data.store.book[3];
  const queries = [
    '$..book[(@.length-1)]',
    '$..book[(@.length-1)]'
  ];
  runQueries(t, queries, expected);
  t.end();
});

test('support chars', t => {
  const d = {
    a0: 1,
    'a-one': 2,
    a2: {
      a0: 3,
      'a-one': 4,
    }
  };
  runQueries(t, [ '$.a0' ], 1, d);
  runQueries(t, [ '${"a0"}' ], { a0: 1 }, d);
  runQueries(t, [ '$["a0"]' ], [ 1 ], d);
  runPaths(t, [ '$.a0' ], [ [ 'a0' ] ], d);
  runQueries(t, [ '$.a-one' ], 2, d);
  runQueries(t, [ '${"a-one"}' ], { 'a-one': 2 }, d);
  runQueries(t, [ '$["a-one"]' ], [ 2 ], d);
  runPaths(t, [ '$.a-one' ], [ [ 'a-one' ] ], d);
  runQueries(t, [ '$..a0' ], [ 1, 3 ], d);
  runPaths(t, [ '$..a0' ], [ [ 'a0' ], [ 'a2', 'a0' ] ], d);
  runQueries(t, [ '$..a-one' ], [ 2, 4 ], d);
  runPaths(t, [ '$..a-one' ], [ [ 'a-one' ], [ 'a2', 'a-one' ] ], d);
  t.end();
});

test('paths into empty array', t => {
  const data = { a: [ { b: 1 }, { a: 2 }, { b: 3 } ] };
  runQueries(t, [ 'a.c' ], void 0, data);
  runPaths(t, [ 'a.c' ], [], data);
  runQueries(t, [ '$..c' ], void 0, data);
  runPaths(t, [ '$..c' ], [], data);
  runQueries(t, [ 'a.b' ], [ 1, 3 ], data);
  runPaths(t, [ 'a.b' ], [ [ 'a', 0, 'b' ], [ 'a', 2, 'b' ] ], data);
  runQueries(t, [ '$..b' ], [ 1, 3 ], data);
  runPaths(t, [ '$..b' ], [ [ 'a', 0, 'b' ], [ 'a', 2, 'b' ] ], data);
  t.end();
});

test('recurse failure', t => {
  const expected = data;
  const queries = [
    '$..'
  ];
  const paths = [];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get root', t => {
  const expected = data;
  const queries = [
    '$'
  ];
  const paths = [];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get wildcard', t => {
  const expected = data.store;
  const queries = [
    '$.store.*'
  ];
  const paths = [ [ 'store' ] ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('simple prop with no prev', t => {
  const expected = data.store;
  const queries = [
    'store'
  ];
  const paths = [ [ 'store' ] ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get expr', t => {
  const expected = data.store.book[3];
  const queries = [
    '$..book[(@.length-1)]'
  ];
  const paths = [
    [ 'store', 'book', 3 ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get fexpr', t => {
  const expected = data.store.book.filter(x => x.price > 20);
  const queries = [
    '$..book[?(@.price > 20)]'
  ];
  const paths = [
    [ 'store', 'book', 3 ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get mexpr', t => {
  const expected = data.store.book.map(x => x.title);
  const queries = [
    '$..book[!(@.title)]'
  ];
  runQueries(t, queries, expected);
  t.end();
});

test('get coerce/mexpr', t => {
  const expected = data.store.book.map(x => String(x.price));
  const queries = [
    '$..book[!(String(@.price))]',
    '$..book.price<String>'
  ];
  runQueries(t, queries, expected);
  t.end();
});

test('coerce <String>', t => {
  t.plan(1);
  const expected = '10.25';
  const result = query('$.a<String>', { a: 10.25 });
  t.equal(result, expected, 'should coerce to String');
});

test('coerce <float>', t => {
  t.plan(1);
  const expected = 10.25;
  const result = query('$.a<float>', { a: '10.25' });
  t.equal(result, expected, 'should coerce to float');
});

test('coerce <int>', t => {
  t.plan(1);
  const expected = 10;
  const result = query('$.a<int>', { a: '10.25' });
  t.equal(result, expected, 'should coerce to int');
});

test('coerce <Number>', t => {
  t.plan(1);
  const expected = 10.4545;
  const result = query('$.a<Number>', { a: '10.4545' });
  t.equal(result, expected, 'should coerce to Number');
});

test('get slice/union', t => {
  const expected = data.store.book.slice(1, 4);
  const queries = [
    '$..book[1:4]',
    '$..book[1,2,3]'
  ];
  const paths = [
    [ 'store', 'book', 1 ],
    [ 'store', 'book', 2 ],
    [ 'store', 'book', 3 ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('slice - no start', t => {
  const expected = data.store.book.slice(0, 1);
  const queries = [
    '$..book[:1]'
  ];
  const paths = [
    [ 'store', 'book', 0 ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('slice - no end', t => {
  const expected = data.store.book.slice(1);
  const queries = [
    '$..book[1:]'
  ];
  const paths = [
    [ 'store', 'book', 1 ],
    [ 'store', 'book', 2 ],
    [ 'store', 'book', 3 ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('mexpr - non-array', t => {
  const expected = data.store.bicycle.price * 2;
  const queries = [
    '$.store.bicycle[!(@.price * 2)]'
  ];
  const paths = [
    [ 'store', 'bicycle' ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get all authors', t => {
  const expected = [ 'Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien' ];
  const queries = [
    '$..book.author',
    '$..author'
  ];
  const paths = [
    [ 'store', 'book', 0, 'author' ],
    [ 'store', 'book', 1, 'author' ],
    [ 'store', 'book', 2, 'author' ],
    [ 'store', 'book', 3, 'author' ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get specific author', t => {
  const expected = [ 'Nigel Rees' ];
  const queries = [
    '$..book.0.author',
    '$..book[?(@.price === 8.95)].author',
    '$..book[?(@.author.startsWith("Nigel"))].author',
    '$.store.book[0].author'
  ];
  const paths = [
    [ 'store', 'book', 0, 'author' ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
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
  const paths = [
    [ 'store', 'book', 0, 'author' ],
    [ 'store', 'book', 2, 'author' ],
    [ 'store', 'book', 0, 'title' ],
    [ 'store', 'book', 2, 'title' ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get specific author, title as object', t => {
  const expected = [
    {
      author: 'Nigel Rees',
      title: 'Sayings of the Century'
    },
    {
      author: 'Herman Melville',
      title: 'Moby Dick'
    }
  ];
  const queries = [
    '$..book[?(@.price < 10)]{"author","title"}',
    '$..book[?(@.title.toLowerCase().indexOf("c") > -1)]{"author","title"}',
  ];
  const paths = [
    [ 'store', 'book', 0, 'author' ],
    [ 'store', 'book', 2, 'author' ],
    [ 'store', 'book', 0, 'title' ],
    [ 'store', 'book', 2, 'title' ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get bicycle with member', t => {
  const expected = [ 'red' ];
  const queries = [
    '$.store.bicycle["color"]'
  ];
  const paths = [
    [ 'store', 'bicycle', 'color' ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get bicycle with omember', t => {
  const expected = { color: 'red' };
  const queries = [
    '$.store.bicycle{"color"}'
  ];
  const paths = [
    [ 'store', 'bicycle', 'color' ]
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get authors with member', t => {
  const expected = data.store.book.map(x => [ x.author ]);
  const queries = [
    '$.store.book["author"]'
  ];
  const paths = [
    [ 'store', 'book', 0, 'author' ],
    [ 'store', 'book', 1, 'author' ],
    [ 'store', 'book', 2, 'author' ],
    [ 'store', 'book', 3, 'author' ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('get authors with omember', t => {
  const expected = data.store.book.map(x => ({ author: x.author }));
  const queries = [
    '$.store.book{"author"}'
  ];
  const paths = [
    [ 'store', 'book', 0, 'author' ],
    [ 'store', 'book', 1, 'author' ],
    [ 'store', 'book', 2, 'author' ],
    [ 'store', 'book', 3, 'author' ],
  ];
  runQueries(t, queries, expected);
  runPaths(t, queries, paths);
  t.end();
});

test('circular reference guard', t => {
  const foo = {
    a: 1,
  };
  const bar = {
    b: 2,
    foo,
  };
  foo.bar = bar;
  const data = {
    bar,
    foo,
  };

  const expected = [ bar.b ];
  const path = [ [ 'bar', 'b' ] ];
  t.doesNotThrow(() => query('$..b', data), 'should not throw a stack size exceeded');
  t.deepEquals(query('$..b', data), expected, 'should return expected results');
  t.doesNotThrow(() => paths('$..b', data), 'should not throw stack size exceeded');
  t.deepEquals(paths('$..b', data), path, 'should return expected results');
  t.end();
});

test('changejs example', t => {
  const expected = [
    [ 1, 2, 3 ], [ 4, 5, 6 ],
    12, 13.5, 11.8,
    [ 1, 2, 3 ], [ 4, 5, 6 ],
    12, 13.5, 11.8,
    [ 1, 2, 3 ], [ 4, 5, 6 ],
    12, 13.5, 11.8,
    [ 1, 2, 3 ], [ 4, 5, 6 ],
    12, 13.5, 11.8
  ];
  const queries = [
    '$..h[*].foo'
  ];
  runQueries(t, queries, expected, require('./change.json'));
  t.end();
});
