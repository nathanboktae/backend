var expect = require('chai').expect
var backend = require('../../index')
var originalDefaults = backend.defaults

describe('backend with vanillajs', function() {

  afterEach(function() {
    backend.defaults = originalDefaults
    backend.clear()
  })

  it('should throw an error when no mock has been defined for a request', function() {
    var xhr = new XMLHttpRequest()

    xhr.open('POST', 'api/login')

    try {
      xhr.send({
        username: 'bob',
        password: 'open-seasame'
      })
    } catch (e) {
      e.should.be.instanceof(Error)
      e.message.should.equal('Unexpected request: POST api/login\n{"username":"bob","password":"open-seasame"}')
      return
    }

    throw new Error('No error was thrown with bad params')
  })

  it('should serve up mock data when defined', function() {
    var xhr = new XMLHttpRequest(), response

    backend.when('GET', '/user').respond({
      name: 'Jane Doe'
    })

    xhr.onreadystatechange = function() {
      response = xhr.response
    }

    xhr.open('GET', '/user')
    xhr.send()
    backend.flush()

    response.should.be.a('string')
    response = JSON.parse(response)
    response.should.be.a('object')
    response.name.should.equal('Jane Doe')
  })

  it('should throw an error when mock exists but does not match headers', function() {
    var xhr = new XMLHttpRequest()
    var response

    backend.when('GET', 'fixtures/data.json', undefined, {
      'X-test': 'correct'
    }).respond({
      test: 'toast is the perfect place for jelly to lay'
    })

    xhr.open('GET', 'fixtures/data.json')
    xhr.setRequestHeader('X-test', 'wrong')

    try {
      xhr.send()
    } catch (e) {
      e.should.be.instanceof(Error)
      e.message.should.equal('Unexpected request: GET fixtures/data.json')
    }
  })

  it('should serve up mock data when headers do match', function() {
    var xhr = new XMLHttpRequest()
    var response

    backend.when('GET', 'fixtures/data.json', undefined, {
      'X-test': 'correct'
    }).respond({
      test: 'toast is the perfect place for jelly to lay'
    })

    xhr.onreadystatechange = function() {
      response = xhr.response
    }

    xhr.open('GET', 'fixtures/data.json')
    xhr.setRequestHeader('X-test', 'correct')
    xhr.send()
    backend.flush()

    response.should.be.a('string')
    response = JSON.parse(response)
    response.should.be.a('object')
    response.test.should.equal('toast is the perfect place for jelly to lay')
  })

  it('should passthrough to a real request when explicitly opted in', function(done) {
    var xhr = new XMLHttpRequest()

    backend.when('GET', 'fixtures/data.json').passthrough()

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return
      var response = xhr.response
      response.should.be.a('string')
      response = JSON.parse(response)
      response.should.be.a('object')
      response.test.should.equal('hi')
      done()
    }

    xhr.open('GET', 'fixtures/data.json')
    xhr.send()
  })

  it('should handle async requests in an async fashion', function(done) {
    var xhr = new XMLHttpRequest()
    var response

    backend.when('GET', 'fixtures/data.json').respond({
      test: 'oh my glob'
    })

    xhr.onreadystatechange = function() {
      response = JSON.parse(xhr.responseText)
      response.should.be.a('object')
      response.test.should.equal('oh my glob')
      done()
    }

    xhr.open('GET', 'fixtures/data.json')
    xhr.send()

    expect(response).not.to.exist
  })

  it('should be able to delay the xhr call via defaults', function(done) {
    var startTime = new Date().getTime()
    var xhr = new XMLHttpRequest()
    var response

    backend.defaults.delay = 550

    backend
      .when('GET', 'fixtures/data.json')
      .respond({
        test: 'oh my glob'
      })

    xhr.onreadystatechange = function() {
      response = JSON.parse(xhr.responseText)
      response.should.be.a('object')
      response.test.should.equal('oh my glob')
      expect(new Date().getTime() - startTime).to.be.above(500)
      done()
    }

    xhr.open('GET', 'fixtures/data.json', true)
    xhr.send()

    expect(response).not.to.exist
  })

  it('should be able to delay the xhr call via explicit options, overriding defaults', function(done) {
    var startTime = new Date().getTime(),
        xhr = new XMLHttpRequest(),
        response

    backend.defaults.delay = 1100

    backend
      .when('GET', 'fixtures/data.json')
      .options({
        delay: 550
      })
      .respond({
        test: 'oh my glob'
      })

    xhr.onreadystatechange = function() {
      response = JSON.parse(xhr.responseText)
      response.should.be.a('object')
      response.test.should.equal('oh my glob')
      expect(new Date().getTime() - startTime).to.be.above(500).and.below(700)
      done()
    }

    xhr.open('GET', 'fixtures/data.json', true)
    xhr.send()

    expect(response).not.to.exist
  })

  it('should serve up mock data when params match', function() {
    var xhr = new XMLHttpRequest()

    backend.when('GET', 'fixtures/data.json', {
      reno: '911'
    }).respond({
      deputy: 'clementine'
    })

    xhr.open('GET', 'fixtures/data.json')
    xhr.send({
      reno: '911'
    })
    backend.flush()

    expect(JSON.parse(xhr.responseText)).to.eql({
      deputy: 'clementine'
    })
  })

  it('should not serve up mock data when params do not match', function() {
    var xhr = new XMLHttpRequest()

    backend.when('POST', 'api/theanswer', {
      yes: true
    }).respond({
      test: 'bye'
    })

    xhr.open('POST', 'api/theanswer')

    try {
      xhr.send({
        yes: false
      })
    } catch (e) {
      e.message.should.equal('Unexpected request: POST api/theanswer\n{"yes":false}')
    }
  })

  it('should allow for globs', function() {
    var xhr = new XMLHttpRequest()

    backend.when('GET', 'fixtures/*.json').respond({
      ding: 'dong'
    })

    xhr.open('GET', 'fixtures/data.json')
    xhr.send()
    backend.flush()

    expect(JSON.parse(xhr.responseText)).to.eql({
      ding: 'dong'
    })
  })

  it('should accept functions within .respond() for dynamic responses', function() {
    var xhr = new XMLHttpRequest()

    backend.when('GET', 'fixtures/*.json').respond(function() {
      return {
        ohh: 'yeah'
      }
    })

    xhr.open('GET', 'fixtures/data.json')
    xhr.send()
    backend.flush()

    expect(JSON.parse(xhr.responseText)).to.eql({
      ohh: 'yeah'
    })
  })

})
