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
}

export const mapFilter = f => x => {
  const output = [];
  const input = x.slice();
  let xi;
  while (xi = input.shift()) {
    const result = f(xi);
    if (typeof result !== 'undefined') output.push(result);
  }
  return output.length ? output : void 0;
}

export const pathFilter = f => x => {
  const output = [];
  let i = 0, xi;
  while (xi = x[i]) {
    const result = f(xi);
    if (result) output.push([ i ]);
    i++;
  }
  return output;
}

export const searchFor = (o, p, visited = new Set()) => {
  let result = [];
  if (visited.has(o)) return result;
  visited.add(o);
  for (const k in o) {
    if (k === p) result = result.concat(o[k]);
    if (isPlainObject(o[k]) || Array.isArray(o[k]))
      result = result.concat(searchFor(o[k], p, visited));
  }
  return result;
}

export const searchForPath = (o, p, ps = [], visited = new Set()) => {
  let result = [];
  if (visited.has(o)) return result;
  visited.add(o);
  const coerce = Array.isArray(o) ? Number : x => x;
  for (const k in o) {
    if (k === p) result = result.concat([ ps.concat(coerce(k)) ]);
    if (isPlainObject(o[k]) || Array.isArray(o[k]))
      result = result.concat(searchForPath(o[k], p, ps.concat(coerce(k)), visited));
  }
  return result;
}

export const join = (paths, to) => {
  if (!to.length) return paths;
  const result = [];
  for (const p of paths) {
    for (const t of to) {
      result.push([ ...t, ...p ]);
    }
  }
  return result;
}

export const slicePaths = (x, start, end = x.length) => {
  let i = start;
  const output = [];
  while (i < end) {
    output.push([ i ]);
    i++;
  }
  return output;
}
