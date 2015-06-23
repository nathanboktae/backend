var expect = require('chai').expect;
var backend = require('../../index');

describe('backend with vanillajs', function() {

  afterEach(function () {
    backend.clear();
  });

  it('should attempt to hit end point when mock does not exist', function() {
    var xhr = new XMLHttpRequest();
    var response;

    xhr.onreadystatechange = function() {
      response = xhr.response;
    };

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send();

    response.should.be.a('string');
    response = JSON.parse(response);
    response.should.be.a('object');
    response.test.should.equal('hi');
  });

  it('should serve up mock data when defined', function() {
    var xhr = new XMLHttpRequest();
    var response;

    backend.when('GET', 'fixtures/data.json').respond({
      test: 'toast is the perfect place for jelly to lay'
    });

    xhr.onreadystatechange = function() {
      response = xhr.response;
    };

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send();

    response.should.be.a('string');
    response = JSON.parse(response);
    response.should.be.a('object');
    response.test.should.equal('toast is the perfect place for jelly to lay');
  });

  it('should attempt to hit end point when mock exist but does not match headers', function() {
    var xhr = new XMLHttpRequest();
    var response;

    backend.when('GET', 'fixtures/data.json', undefined, {
      'X-test': 'correct'
    }).respond({
      test: 'toast is the perfect place for jelly to lay'
    });

    xhr.onreadystatechange = function() {
      response = xhr.response;
    };

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.setRequestHeader('X-test', 'wrong');
    xhr.send();

    response.should.be.a('string');
    response = JSON.parse(response);
    response.should.be.a('object');
    response.test.should.equal('hi');
  });

  it('should serve up mock data when headers do match', function() {
    var xhr = new XMLHttpRequest();
    var response;

    backend.when('GET', 'fixtures/data.json', undefined, {
      'X-test': 'correct'
    }).respond({
      test: 'toast is the perfect place for jelly to lay'
    });

    xhr.onreadystatechange = function() {
      response = xhr.response;
    };

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.setRequestHeader('X-test', 'correct');
    xhr.send();

    response.should.be.a('string');
    response = JSON.parse(response);
    response.should.be.a('object');
    response.test.should.equal('toast is the perfect place for jelly to lay');
  });

  it('should handle async requests in an async fashion', function (done) {
    var xhr = new XMLHttpRequest();
    var response;

    backend.when('GET', 'fixtures/data.json').respond({
      test: 'oh my glob'
    });

    xhr.onreadystatechange = function () {
      response = JSON.parse(xhr.responseText);
      response.should.be.a('object');
      response.test.should.equal('oh my glob');
      done();
    };

    xhr.open('GET', 'fixtures/data.json', true);
    xhr.send();

    expect(response).not.to.exist;
  });

  it('should be able to delay the xhr call', function (done) {
    var startTime = new Date().getTime();
    var xhr = new XMLHttpRequest();
    var response;

    backend
    .when('GET', 'fixtures/data.json')
    .options({
      delay: 1100
    })
    .respond({
      test: 'oh my glob'
    });

    xhr.onreadystatechange = function () {
      response = JSON.parse(xhr.responseText);
      response.should.be.a('object');
      response.test.should.equal('oh my glob');
      expect(new Date().getTime() - startTime).to.be.above(1000);
      done();
    };

    xhr.open('GET', 'fixtures/data.json', true);
    xhr.send();

    expect(response).not.to.exist;
  });

  it('should serve up mock data when params match', function () {
    var xhr = new XMLHttpRequest();

    backend.when('GET', 'fixtures/data.json', { reno: '911' }).respond({
      deputy: 'clementine'
    });

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send({ reno: '911' });

    expect(JSON.parse(xhr.responseText)).to.eql({
      deputy: 'clementine'
    });
  });

  it('should not serve up mock data when params do not match', function () {
    var xhr = new XMLHttpRequest();

    backend.when('GET', 'fixtures/data.json', { yes: true }).respond({
      test: 'bye'
    });

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send({ yes: false });

    expect(JSON.parse(xhr.responseText)).to.eql({
      test: 'hi'
    });
  });

  it('should allow for globs', function () {
    var xhr = new XMLHttpRequest();

    backend.when('GET', 'fixtures/*.json').respond({
      ding: 'dong'
    });

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send();

    expect(JSON.parse(xhr.responseText)).to.eql({
      ding: 'dong'
    });
  });

  it('should accept functions within .respond() for dynamic responses', function () {
    var xhr = new XMLHttpRequest();

    backend.when('GET', 'fixtures/*.json').respond(function () {
      return { ohh: 'yeah' };
    });

    xhr.open('GET', 'fixtures/data.json', false);
    xhr.send();

    expect(JSON.parse(xhr.responseText)).to.eql({
      ohh: 'yeah'
    });
  });

});
