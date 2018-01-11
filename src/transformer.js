import maybe from './maybe';

export default transformer;

function transformer(ops) {
  return function(data, withPaths) {
    return ops.reduce((acc, f) => f(acc), { data: maybe(data), path: maybe([]), withPaths });
  }
}
