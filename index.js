'use strict'

var mocks = require('./lib/mocks')
var pending = require('./lib/pending')
var backend = module.exports = {}

global.XMLHttpRequest = require('./lib/request')


function when(expected, method, url, data, headers) {
  var mock = mocks.create(method, url, data, headers, expected)

  return {
    respond: function(status, data, headers) {
      if (typeof status != 'number') {
        headers = data, data = status, status = 200
      }
      mock.response = {
        status: status,
        data: data,
        headers: headers
      }
    },
    passthrough: function() {
      mock.passthrough = true
    },
  }
}

backend.when = when.bind(backend, false)
backend.expect = when.bind(backend, true)

;['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(function(method) {
  backend['expect' + method] = when.bind(backend, true, method)
})

backend.verifyNoOutstandingExpectation = function() {
  var expected = mocks.outstandingExpected()
  if (expected.length) {
    throw new Error('Expected no outstanding expectations, but there were ' + expected.length + '\n' + expected[0].toString());
  }
}

backend.verifyNoOutstandingRequest = function() {
  var inFlight = pending.outstanding()
  if (inFlight.length) {
    throw new Error('Expected no outstanding requests, but there were ' + inFlight.length + '\n' + inFlight[0].toString());
  }
}

backend.flush = function() {
  pending.flush()
}

backend.clear = function() {
  mocks.clear()
  pending.clear()
}
