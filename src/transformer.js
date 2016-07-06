import maybe from './maybe';

export default transformer;

function transformer(ops) {
  return function(data) {
    return ops.reduce((acc, f) => f(acc), maybe(data)).get();
  }
};