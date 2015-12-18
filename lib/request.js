'use strict'

var mocks = require('./mocks')
var pending = require('./pending')
var HttpRequest = global.XMLHttpRequest


var Request = module.exports = function() {
  var fakeRequest = this,
    request = new HttpRequest(),
    headers = {},
    mock, method, url

  this.sendRealRequest = function(params) {
    var resolve = fakeRequest.onreadystatechange || fakeRequest.onload || function() {}
    delete fakeRequest.onreadystatechange
    delete fakeRequest.onload

    request.addEventListener('readystatechange', function() {
      if (request.readyState !== 4) return
      fakeRequest.readyState = 4
      fakeRequest.status = request.status
      fakeRequest.response = request.response
      fakeRequest.responseText = request.responseText
      Object.assign(fakeRequest, request)
      resolve()
    })

    Object.keys(request).forEach(function(key) {
      fakeRequest[key] = request[key]
    })

    request.open(method, url)

    Object.keys(headers || {}).forEach(function(name) {
      request.setRequestHeader(name, headers[name])
    })

    request.send(params)
  }

  this.sendFakeRequest = function(params, headers) {
    var resolve = fakeRequest.onreadystatechange || fakeRequest.onload || function() {}
    var response = mock.response.data

    if (typeof response == 'function') {
      response = response(params, headers)
    }

    if (response && typeof response == 'object') {
      response = JSON.stringify(response)
    }

    Object.assign(fakeRequest, {
      readyState: 4,
      status: mock.response.status,
      response: response,
      responseText: response
    })

    resolve = resolve.bind(fakeRequest)

    pending.add(setTimeout(function() {
      pending.remove(fakeRequest)
      resolve()
    }, mock.options.delay), fakeRequest)
  }

  this.open = function(_method, _url) {
    method = _method
    url = _url
  }

  /**
   * Captures params and then checks to see if we have a stubbed request
   * If we do, then it simulates a response, otherwise it attempts to
   * make the actual request
   * @param {*} params
   */
  this.send = function(params) {
    // jquery will set to null
    params = params || undefined

    if (!(mock = mocks.match(method, url, params, headers))) {
      var msg = 'Unexpected request: ' + method + ' ' + url
      if (params) {
        msg += typeof params == 'object' ? ('\n' + JSON.stringify(params)) : params
      }
      throw new Error(msg);
    }

    if (!mock.response && !mock.passthrough) {
      throw new TypeError('No response has been defined for ' + mock.toString());
    }

    return mock.passthrough ? fakeRequest.sendRealRequest(params) : fakeRequest.sendFakeRequest(params, headers)
  }

  this.setRequestHeader = function(key, value) {
    headers[key] = value
  }

  this.getAllResponseHeaders = function() {
    if (mock.passthrough) return request.getAllResponseHeaders()

    return Object.keys(mock.response.headers || {}).map(function(name) {
      return name + ': ' + mock.response.headers[name]
    }).join('\n')
  }

  this.getResponseHeader = function(key) {
    if (mock.passthrough) return request.getResponseHeader()

    return mock.response.headers[key]
  }

  this.overrideMimeType = function() {
    request.overrideMimeType()
  }

  this.abort = function() {
    if (mock.passthrough) return request.abort()

    pending.remove(fakeRequest)
    if (this.onabort) {
      this.onabort()
    }
  }

  this.toString = function() {
    return method + ' ' + url + ' -> ' + fakeRequest.status
  }
}
