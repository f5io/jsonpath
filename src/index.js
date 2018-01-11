import tokenizer from './tokenizer';
import parser from './parser';
import transformer from './transformer';

const cache = new Map();
const withPaths = [ 'path' ];

export const paths = factory('path');
export default factory('data');

function factory(type) {
  return function(q, data = null) {
    if (!cache.has(q)) cache.set(q, transformer(parser(tokenizer(q))));
    const fn = cache.get(q);
    const paths = withPaths.includes(type);
    if (data === null) return d => fn(d, paths)[type].get();
    return fn(data, paths)[type].get();
  }
}
