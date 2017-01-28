export const map = f => x => x.map(f);

export const head = x => x[0];

export const Identity = x => x;

export const isObject = o => typeof o === 'object';

const isObjectObject = o =>
  o != null && isObject(o) && !Array.isArray(o);

export const isPlainObject = o => {
  if (isObjectObject(o) === false) return false;
  if (typeof o.constructor !== 'function') return false;
  if (isObjectObject(o.constructor.prototype) === false) return false;
  if (o.constructor.prototype.hasOwnProperty('isPrototypeOf') === false) return false;
  return true;
};

export const mapFilter = f => x => {
  const output = [];
  let xi;
  while (xi = x.shift()) {
    const result = f(xi);
    if (typeof result !== 'undefined') output.push(result);
  }
  return output;
};
