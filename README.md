# jsonpath
<p align="center">
  <a href="https://travis-ci.org/f5io/jsonpath"><img alt="Build Status" src="https://travis-ci.org/f5io/jsonpath.svg?branch=master"></a>
  <a href="https://coveralls.io/github/f5io/jsonpath?branch=master"><img alt="Coverage Status" src="https://coveralls.io/repos/github/f5io/jsonpath/badge.svg?branch=master"></a>
</p>
---
Performant JSONPath implementation that focusses on results

**Features**

- Fast
- Extended syntax support
- Error safe, using a simple Maybe functor under the hood
- Memoized compilation of queries
- 100% code coverage

**Syntax**

COMING SOON

**Installation**

```bash
$ npm install --save @f5io/jsonpath
```
or if you have yarn installed on your machine

```bash
$ yarn add @f5io/jsonpath
```

**Usage**

```js
const jp = require('@f5io/jsonpath');
const jsonPathQueryStr = '$..h[?(@.foo>13)]';
const result = jp(jsonPathQueryStr,jsonObject);
```

**Contributors**

- Joe Harlow [@f5io](https://github.com/f5io)
- Amit Gupta [@amitguptagql](https://github.com/amitguptagwl)
