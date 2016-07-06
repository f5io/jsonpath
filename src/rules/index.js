import tokenizer from '../tokenizer';
import parser from '../parser';
import { Identity, head, map, isPlainObject } from '../utils';

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
      function search(x, p) {
        let a = [];
        for (const k in x) {
          if (k === p) a = a.concat(x[k]);
          if (isPlainObject(x[k]) || Array.isArray(x[k]))
            a = a.concat(search(x[k], p));
        }
        return a;
      };

      const next = arr[i + 1];
      if (next && next.type === 'prop')
        return acc.concat(map(x => search(x, next.value)));
      else return acc;
    }
  },
  [5]: {
    type: 'prop',
    re: /^([A-Za-z][^\W]*)/,
    parse: function prop(acc, { value }, i, arr) {
      const prev = arr[i - 1];
      if (prev && prev.type === 'recurse') return acc;
      
      const getProps = x =>
        Array.isArray(x) ?
          x.map(y => y[value]) :
          x[value];
      
      return acc.concat(map(getProps));
    }
  },
  [7]: {
    type: 'array',
    re: /^\[([^\]]+)\]/,
    map: m => tokenizer(m[1]),
    parse: function array(acc, { value }) {
      const output = parser(value);
      return acc.concat(...output);
    }
  },
  [9]: {
    type: 'expr',
    re: /^\(([^$]+)\)/,
    map: m => m[1],
    parse: function expr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);
      return acc.concat(map(x => x[fn(x)]));
    }
  },
  [11]: {
    type: 'mexpr',
    re: /^\!\(([^$]+)\)/,
    map: m => m[1],
    parse: function mexpr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);
      const getProps = x =>
        Array.isArray(x) ?
          x.map((y, i) => fn(y)) :
          fn(x);
      return acc.concat(map(getProps));
    }
  },
  [13]: {
    type: 'fexpr',
    re: /^\?\(([^$]+)\)/,
    map: m => m[1],
    parse: function fexpr(acc, { value }) {
      const fn = new Function('y', `return ${value.replace(/@/g, 'y')}`);
      return acc.concat(map(x => x.filter(fn)));
    }
  },
  [15]: {
    type: 'coerce',
    re: /^\<(String|Number|int|float)\>$/,
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
        Array.isArray(x) ?
          x.map(fn) :
          fn(x);
      return acc.concat(map(getProps));
    }
  },
  [17]: {
    type: 'slice',
    re: /^(-?(?:0|[1-9][0-9]*))?\:(-?(?:0|[1-9][0-9]*))?(\:(-?(?:0|[1-9][0-9]*))?)?/,
    map: m => ({
      start: m[1] || '0',
      end: m[2],
      step: (m[3] || ':1').slice(1)
    }),
    parse: function slice(acc, { value }) {
      // TODO: Support step option
      const args = [ value.start ];
      if (value.end) args.push(value.end);
      return acc.concat(map(x => x.slice(...args)));
    }
  },
  [22]: {
    type: 'union',
    re: /^((0|[1-9][0-9]*)\,?)+/,
    map: m => m[0].split(',').filter(Identity),
    parse: function union(acc, { value }) {
      return acc.concat(map(x => value.map(y => x[y])));
    }
  },
  [25]: {
    type: 'member',
    re: /^(?:[\'|\"](?:[^\W]+)[\'|\"]\,?\s?)+/,
    map: m => m[0].split(',').filter(Identity).map(x => x.trim().slice(1, -1)),
    parse: function member(acc, { value }) {
      const getProps = x =>
        Array.isArray(x) ?
          x.map(y => value.reduce((acc, z) => (acc.push(y[z]), acc), [])) :
          value.reduce((acc, z) => (acc.push(x[z]), acc), []);
      return acc.concat(map(getProps));
    }
  },
  [26]: {
    type: 'omember',
    re: /^\{(?:[\'|\"](?:[^\W]+)[\'|\"]\,?\s?)+\}/,
    map: m => m[0].slice(1, -1).split(',').filter(Identity).map(x => x.trim().slice(1, -1)),
    parse: function omember(acc, { value }) {
      const getProps = x =>
        Array.isArray(x) ?
          x.map(y => value.reduce((acc, z) => (acc[z] = y[z], acc), {})) :
          value.reduce((acc, z) => (acc[z] = x[z], acc), {});
      return acc.concat(map(getProps));
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
};