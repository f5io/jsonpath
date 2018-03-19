import tokenizer from '../tokenizer';
import parser from '../parser';
import { Identity, head, join, mapFilter, pathFilter, slicePaths, searchFor, searchForPath } from '../utils';

const rules = {
  [1]: {
    type: 'root',
    re: /^\$/
  },
  [2]: {
    type: 'dot',
    re: /^\.(?!\.)/
  },
  [3]: {
    type: 'wildcard',
    re: /^\*/
  },
  [4]: {
    type: 'recurse',
    re: /^\.{2}/,
    parse: function recurse(acc, { value }, i, arr) {
      const next = arr[i + 1];
      if (next && next.type === 'prop')
        return acc.concat(({ data, path, withPaths }) => {
          const d = data.map(x => {
            const result = searchFor(x, next.value);
            return result.length ? result : void 0;
          });
          return ({
            data: d,
            path: withPaths
              ? path.chain(p => d.chain(_ => data.map(x => join(searchForPath(x, next.value), p))))
              : path,
            withPaths,
          });
        });
      else return acc;
    }
  },
  [5]: {
    type: 'prop',
    re: /^([_\-A-Za-z][^.|[|<|{]*)/,
    parse: function prop(acc, { value }, i, arr) {
      let offset = 1;
      let prev = arr[i - offset];
      if (prev && prev.type === 'recurse') return acc;
      prev = prev || { type: null };

      while (prev.type === 'dot') {
        prev = arr[i - (++offset)];
      }

      const ignored = [ 'union', 'array' ];

      const getProps = x =>
        Array.isArray(x) ? mapFilter(y => y[value])(x) : x[value];

      const getPaths = x =>
        Array.isArray(x) && !ignored.includes(prev.type)
          ? join([ [ value ] ], pathFilter(y => y[value])(x))
          : [ [ value ] ];

      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(getProps);
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.chain(_ => data.map(x => join(getPaths(x), p))))
            : path,
          withPaths,
        });
      });
    }
  },
  [7]: {
    type: 'array',
    re: /^\[([^\]]+)\]/,
    map: m => tokenizer(m[1]),
    parse: function array(acc, { value }, i, arr) {
      const prev = arr[i - 1];
      const output = parser([ { type: prev.type, parse: Identity }, ...value ]);
      return acc.concat(...output);
    }
  },
  [9]: {
    type: 'expr',
    re: /^\(([^$]+)\)/,
    map: m => m[1],
    parse: function expr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);
      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(x => x[fn(x)]);
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.chain(_ => data.map(x => join([ [ fn(x) ] ], p))))
            : path,
          withPaths,
        });
      });
    }
  },
  [11]: {
    type: 'mexpr',
    re: /^!\(([^$]+)\)/,
    map: m => m[1],
    parse: function mexpr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);

      const getProps = x =>
        Array.isArray(x) ? x.map((y, i) => fn(y)) : fn(x);

      return acc.concat(({ data, path, withPaths }) => ({
        data: data.map(getProps), path, withPaths,
      }));
    }
  },
  [13]: {
    type: 'fexpr',
    re: /^\?\(([^$]+)\)/,
    map: m => m[1],
    parse: function fexpr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);
      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(x => x.filter(fn));
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.chain(_ => data.map(x => join(pathFilter(fn)(x), p))))
            : path,
          withPaths,
        });
      });
    }
  },
  [15]: {
    type: 'coerce',
    re: /^<(String|Number|int|float)>$/,
    map: m => m[1],
    parse: function coerce(acc, { value }) {
      let fn;
      switch(value) {
        case 'String':
          fn = String;
          break;
        case 'Number':
          fn = Number;
          break;
        case 'int':
          fn = x => parseInt(x, 10);
          break;
        case 'float':
          fn = parseFloat;
          break;
      }
      const getProps = x =>
        Array.isArray(x) ? x.map(fn) : fn(x);

      return acc.concat(({ data, path, withPaths }) => ({
        data: data.map(getProps), path, withPaths,
      }));
    }
  },
  [17]: {
    type: 'slice',
    re: /^(-?(?:0|[1-9][0-9]*))?:(-?(?:0|[1-9][0-9]*))?(:(-?(?:0|[1-9][0-9]*))?)?/,
    map: m => ({
      start: Number(m[1] || '0'),
      end: Number(m[2]),
      step: Number((m[3] || ':1').slice(1))
    }),
    parse: function slice(acc, { value }) {
      // TODO: Support step option
      const args = [ value.start ];
      if (value.end) args.push(value.end);
      return acc.concat(({ data, path, withPaths }) => ({
        data: data.map(x => x.slice(...args)),
        path: withPaths
          ? path.chain(p => data.map(x => join(slicePaths(x, ...args), p)))
          : path,
        withPaths,
      }));
    }
  },
  [22]: {
    type: 'union',
    re: /^((0|[1-9][0-9]*),?)+/,
    map: m => m[0].split(',').filter(Identity).map(Number),
    parse: function union(acc, { value }) {
      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(x => value.map(y => x[y]));
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.map(_ => join(value.map(x => [ x ]), p)))
            : path,
          withPaths,
        });
      });
    }
  },
  [25]: {
    type: 'member',
    re: /^(?:['|"](?:[^'|"]+)['|"],?\s?)+/,
    map: m => m[0].split(',').filter(Identity).map(x => x.trim().slice(1, -1)),
    parse: function member(acc, { value }, i, arr) {
      const prev = arr[i - 1];

      const getProps = x =>
        Array.isArray(x)
          ? x.map(y => value.reduce((acc, z) => (acc.push(y[z]), acc), []))
          : value.reduce((acc, z) => (acc.push(x[z]), acc), []);

      const getPaths = x =>
        Array.isArray(x) && prev.type !== 'array'
          ? join(value.map(x => [ x ]), Array.from(x, (_, i) => [ i ]))
          : value.map(x => [ x ]);

      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(getProps);
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.chain(_ => data.map(x => join(getPaths(x), p))))
            : path,
          withPaths,
        });
      });
    }
  },
  [26]: {
    type: 'omember',
    re: /^\{(?:['|"](?:[^'|"]+)['|"],?\s?)+\}/,
    map: m => m[0].slice(1, -1).split(',').filter(Identity).map(x => x.trim().slice(1, -1)),
    parse: function omember(acc, { value }, i, arr) {
      const prev = arr[i - 1];

      const getProps = x =>
        Array.isArray(x)
          ? x.map(y => value.reduce((acc, z) => (acc[z] = y[z], acc), {}))
          : value.reduce((acc, z) => (acc[z] = x[z], acc), {});

      const getPaths = x =>
        Array.isArray(x) && prev.type !== 'array'
          ? join(value.map(x => [ x ]), Array.from(x, (_, i) => [ i ]))
          : value.map(x => [ x ]);

      return acc.concat(({ data, path, withPaths }) => {
        const d = data.map(getProps);
        return ({
          data: d,
          path: withPaths
            ? path.chain(p => d.chain(_ => data.map(x => join(getPaths(x), p))))
            : path,
          withPaths,
        });
      });
    }
  }
};

const regexString = [];
for (let k in rules) {
  const { re } = rules[k];
  regexString.push(`(${re.source})`);
}

const regex = new RegExp(regexString.join('|'));

export { getMatch };
export default getMatch;

function getMatch(str) {
  const result = str.match(regex);
  const { length } = result[0];
  const index = result.slice(1).findIndex(Identity) + 1;
  const mapRes = result.slice(index);
  const { type, map = head, parse = Identity } = rules[index];
  return {
    type,
    length,
    parse,
    value: map(mapRes)
  };
}
