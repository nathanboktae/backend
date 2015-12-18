'use strict'

var deepEqual = require('deep-equal')
var globToRegExp = require('glob-to-regexp')

var Mock = module.exports = function Mock(expected, method, url, data, headers) {
  this.method = method.toUpperCase()
  this.url = url instanceof RegExp ? url : globToRegExp(url)
  this.data = data
  this.headers = headers
  this.expected = !!expected
}

function shallowMatch(obj, matcher) {
  return Object.keys(matcher).reduce(function(result, key) {
    return result && obj[key] === matcher[key]
  }, true)
}

Mock.prototype.match = function match(method, url, data, headers) {
  if (this.url.test(url) && this.method === method.toUpperCase()) {
    // can't do equals(), as jQuery will add extra headers
    if (!this.headers || shallowMatch(headers, this.headers)) {
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (e) {}
      }

      if (!this.data || deepEqual(this.data, data)) {
        return true
      }
    }
  }

  return false
}

Mock.prototype.toString = function() {
  function safeStringify(x) {
    if (!x) return ''
    return '\n' + (typeof x == 'object' ? JSON.stringify(x) : x)
  }

  return (this.expected ? '(expecting) ' + this.method : this.method) +
    ' ' + this.url + safeStringify(this.data) + safeStringify(this.headers)
}