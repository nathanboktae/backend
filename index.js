'use strict'

var mocks = require('./lib/mocks')
var backend = module.exports = {}

var pendingRequests = [];


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
  if (pendingRequests.length) {
    throw new Error('Expected no outstanding requests, but there were ' + pendingRequests.length
      + '\n' + pendingRequests[0].request.toString());
  }
}

backend.flush = function() {
  while (pendingRequests.length) {
    var pending = pendingRequests.shift();
    clearTimeout(pending.timeoutId);

    if (pending.request.onreadystatechange) {
      pending.request.onreadystatechange();
    } else if (pending.request.onload) {
      pending.request.onload();
    }
  }
}

backend.clear = function() {
  mocks.clear()
  pendingRequests.length = 0
}


function removePending(request) {
  for (var i = 0; i < pendingRequests.length; i++) {
    if (pendingRequests[i].request === request) {
      clearTimeout(pendingRequests[i].timeoutId);
      pendingRequests.splice(i, 1);
      return;
    }
  }
}

var HttpRequest = global.XMLHttpRequest

global.XMLHttpRequest = function() {
  var fakeRequest = this,
    request = new HttpRequest(),
    headers = {},
    mock, method, url

  this.sendRealRequest = function(body) {
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
      fakeRequest[key] = fakeRequest[key]
    })

    request.open(method, url)

    Object.keys(headers || {}).forEach(function(name) {
      request.setRequestHeader(name, headers[name])
    })

    request.send(body)
  }

  this.sendFakeRequest = function(body, headers) {
    var resolve = fakeRequest.onreadystatechange || fakeRequest.onload || function() {}
    var response = mock.response.data

    if (typeof response == 'function') {
      response = response(body, headers)
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

    pendingRequests.push({
      timeoutId: setTimeout(function() {
        removePending(fakeRequest)
        resolve.call(fakeRequest)
      }, 0),
      request: fakeRequest
    })
  }

  this.open = function(_method, _url) {
    method = _method
    url = _url
  }

  this.send = function(body) {
    // jquery will set to null
    body = body || undefined

    if (!(mock = mocks.match(method, url, body, headers))) {
      var msg = 'Unexpected request: ' + method + ' ' + url
      if (body) {
        msg += typeof body == 'object' ? ('\n' + JSON.stringify(body)) : body
      }
      throw new Error(msg);
    }

    if (!mock.response && !mock.passthrough) {
      throw new TypeError('No response has been defined for ' + mock.toString());
    }

    return mock.passthrough ? fakeRequest.sendRealRequest(body) : fakeRequest.sendFakeRequest(body, headers)
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

  this.overrideMimeType = request.overrideMimeType.bind(request)

  this.abort = function() {
    if (mock.passthrough) return request.abort()

    removePending(fakeRequest)
    if (this.onabort) {
      this.onabort()
    }
  }

  this.toString = function() {
    return method + ' ' + url + ' -> ' + fakeRequest.status
  }
}
