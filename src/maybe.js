export default maybe;

class Maybe {
  constructor(v) {
    this.value = v;
  }
  bind(f) {
    return this.value ? f(this.value) : this;
  }
  map(f) {
    return this.value ? maybe(f(this.value)) : this;
  }
  get() {
    return this.value;
  }
}

function maybe(v) {
  return new Maybe(v);
}
