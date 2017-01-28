# jsonpath
<p align="center">
  <a href="https://travis-ci.org/f5io/jsonpath"><img alt="Build Status" src="https://travis-ci.org/f5io/jsonpath.svg?branch=master"></a>
  <a href="https://coveralls.io/github/f5io/jsonpath?branch=master"><img alt="Coverage Status" src="https://coveralls.io/repos/github/f5io/jsonpath/badge.svg?branch=master"></a>
</p>
---
Performant JSONPath implementation that focusses on results

**Installation**
```bash
$npm install --save @f5io/jsonpath
```
or if you have yarn installed on your machine

```bash
$yarn add @f5io/jsonpath
```

**Usage**
```js
var jp = require('@f5io/jsonpath');
var jsonPathQueryStr = "$..h[?(@.foo>13)]";
var result = jp(jsonPathQueryStr,jsonObject);
```
