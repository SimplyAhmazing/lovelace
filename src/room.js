'use strict'

/**
 * Creates a new http client to a roomdb instance
 *
 * @param {uri} location Location to connect (defaults to localhost:3000)
 */
import fetch from 'node-fetch'
import io from 'socket.io-client'

function getEnv (key) {
  if (typeof process !== 'undefined') return process.env[key]
}

export default class Room {
  constructor (uri) {
    this.uri = uri || getEnv('ROOMDB_URI') || 'http://localhost:3000'
    this._subscriptions = new Map()
    this._data = null
    this._endpoint = null
  }

  subscribe (facts) {
    const subscriptionName = facts.toString()
    if (this._sockets.has(subscriptionName)) return this._sockets.get(subscriptionName)
    const subscription = io
      .of(`/${subscriptionName}`)
      .on('connection', socket => {
        socket.emit('updateSubscription', facts)
      })
    this._sockets.set(subscriptionName, subscription)
    return {
      on(callback) {
        subscription.on('subscriptionFacts', cb)
      }
    }
  }

  _db () {
    if (!(this._data || this._endpoint)) {
      throw new Error(`please set _data and _endpoint using assert(), retract(), select(), or do()`)
    }
    const endpoint = this.uri + '/' + this._endpoint

    const post = {
      method: 'POST',
      body: JSON.stringify(this._data),
      headers: { 'Content-Type': 'application/json' }
    }

    return fetch(endpoint, post)
      .then(response => {
        this._data = null
        this._endpoint = null
        return response
      })
  }

  select (facts) {
    this._data = {facts}
    this._endpoint = 'select'
    return this
  }

  async do (callbackFn) {
    const {solutions} = await this._db().then(_ => _.json())
    solutions.forEach(callbackFn)
  }

  async doAll (callbackFn) {
    const {solutions} = await this._db().then(_ => _.json())
    callbackFn(solutions)
  }

  assert (fact) {
    this._data = {fact}
    this._endpoint = 'assert'
    this._db()
    return this
  }

  retract (fact) {
    this._data = {fact}
    this._endpoint = 'retract'
    this._db()
    return this
  }

  async retractEverythingAbout (name) {
    this._data = {name}
    this._endpoint = 'retractEverythingAbout'
    await this._db()
  }
}
