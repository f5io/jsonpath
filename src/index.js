import tokenizer from './tokenizer';
import parser from './parser';
import transformer from './transformer';

const cache = new Map();

export default query;

function query(q, data = null) {
  if (!cache.has(q)) cache.set(q, transformer(parser(tokenizer(q))));
  const fn = cache.get(q);
  if (data === null) return d => fn(d);
  return fn(data);
};