export default maybe;

class Maybe {
  constructor(v) {
    this.value = v;
  }
  bind(f) {
    return this.value != null ? f(this.value) : this;
  }
  chain(f) {
    return this.map(f).bind(x => x);
  }
  map(f) {
    return this.value != null ? maybe(f(this.value)) : this;
  }
  get() {
    return this.value;
  }
  getOr(val) {
    return this.value != null ? this.value : val;
  }
}

function maybe(v) {
  return new Maybe(v);
}
