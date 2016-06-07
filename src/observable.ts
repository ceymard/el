
import {pathget, pathset, identity, pathjoin} from './helpers'

export function isObservable<T>(o: any): o is Observable<T> {
  return o instanceof Observable
}

const IS_CHILD = 1
const IS_ANCESTOR = 2
const IS_UNRELATED = 3

function _get_ancestry(p1: string, p2: string) {
  p1 = '' + (p1 || '')
  p2 = '' + (p2 || '')

  // XXX indexOf is *slow*
  if (p1.indexOf(p2) === 0)
    return IS_CHILD // p1 is a child of p2

  if (p2.indexOf(p1) === 0)
    return IS_ANCESTOR // p1 is an ancestor of p2

  return IS_UNRELATED
}

export type O<T> = T | Observable<T>

export type Observer<T> = (obj : T, prop? : string) => void

export type TransformFn<T, U> = (a: T) => U
export type Transformer<T, U> = {
  get: TransformFn<T, U>
  set?: (a: U) => T
}

// type TransformerFn<T, U> = (a: T) => U
// type TransformerFlexible<T, U> = TransformerObj<T, U> | TransformerFn<T, U>

/**
 *
 */
export class Observable<T> {

  public _value : T
  public _observers : Array<Observer<T>>

  constructor(value : T) {
    this._value = value
    this._observers = []
  }

  get() : T {
    return this._value
  }

  getp<U>(prop: string) : U {
    return pathget<U>(this._value, prop)
  }

  set(value : T): boolean {
    let changed = false
    changed = this._value !== value
    this._value = value
    if (changed) {
      this._change('')
    }
    return changed
  }

  setp<U>(prop : string, value : U) : boolean {

    if (pathset(this._value, prop, value)) {
      this._change(prop)
      return true
    }

    return false

  }

  _change(prop : string | number) : void {
    const val = this._value
    const obss = this._observers
    const final_prop = (prop||'').toString()
    for (var i = 0; i < obss.length; i++)
      obss[i](val, final_prop)
  }

  addObserver(fn : Observer<T>) : () => void {
    this._observers.push(fn)
    fn(this._value)
    return () => this.removeObserver(fn)
  }

  removeObserver(fn : Observer<T>) : void {
    const index = this._observers.indexOf(fn)
    if (index > -1) {
      this._observers.splice(index, 1)
    }
  }

  prop<U>(prop : string) : PropObservable<T, U> {
    return new PropObservable<T, U>(this, prop)
  }

  p<U>(prop: string): PropObservable<T, U> {
    return this.prop<U>(prop)
  }

  tf<U>(transformer : Transformer<T, U> | TransformFn<T, U>) : TransformObservable<T, U> {
    if (typeof transformer === 'function') {
      return new TransformObservable<T, U>(this, {get: transformer as TransformFn<T, U>})
    }
    return new TransformObservable<T, U>(this, transformer as Transformer<T, U>)
  }

  tfp<U, V>(prop: string, transformer: Transformer<U, V> | TransformFn<U, V>): TransformObservable<U, V> {

    let obs = this.prop<U>(prop)
    if (typeof transformer === 'function') {
      return new TransformObservable<U, V>(obs, {get: transformer as TransformFn<U, V>})
    }
    return new TransformObservable<U, V>(obs, transformer as Transformer<U, V>)

  }

  /**
   *  Boolean methods
   */

  gt(value: any): Observable<boolean> {
    return this.tf<boolean>({ get: val => val > value })
  }

  lt(value: any): Observable<boolean> {
    return this.tf({ get: val => val < value })
  }

  eq(value: any): Observable<boolean> {
    return this.tf({ get: val => val === value })
  }

  gte(value: any): Observable<boolean> {
    return this.tf({ get: val => val >= value })
  }

  lte(value: any): Observable<boolean> {
    return this.tf({get: val => val <= value})
  }

  isNull(): Observable<boolean> {
    return this.tf({get: val => val == null})
  }

  isNotNull(): Observable<boolean> {
    return this.tf({ get: val => val != null })
  }

  isUndefined(): Observable<boolean> {
    return this.tf({ get: val => val === undefined })
  }

  isDefined(): Observable<boolean> {
    return this.tf({ get: val => val !== undefined })
  }

  isFalse(): Observable<boolean> {
    return this.tf({ get: val => val as any === false })
  }

  isTrue(): Observable<boolean> {
    return this.tf({get: val => val as any === true})
  }

  // FIXME should we do reduce ?

  // ?

  or(...args : Array<Observable<any>>) : Observable<boolean> {
    return Or(...[this, ...args])
  }

  and(...args: Array<Observable<boolean>>) : Observable<boolean> {

    return And(...[this, ...args])
  }

  // Some basic modification functions
  // **These methods are *not* type safe !**
  add(inc: number) {
    (this as any).set(this._value as any + inc)
  }

  sub(dec: number) {
    (this as any).set(this._value as any - dec)
  }

  mul(coef: number) {
    (this as any).set(this._value as any * coef)
  }

  div(coef: number) {
    (this as any).set(this._value as any / coef)
  }

  mod(m: number) {
    (this as any).set(this._value as any % m)
  }

}

export class ArrayObservable<T> extends Observable<Array<T>> {

  /////////////////////////////////////////////////////////////////////////
  // Some array functions

  push(v: T) {
    let res = this._value.push(v)
    this._change(this._value.length - 1)
    this._change('length')
    return res
  }

  pop() {
    let res = this._value.pop()
    this._change(this._value.length)
    this._change('length')
    return res
  }

  shift() {
    let res = this._value.shift()
    this._change(null)
    this._change('length')
    return res
  }

  unshift(v: T) {
    let res = this._value.unshift(v)
    this._change(null)
    this._change('length')
    return res
  }

  sort(fn: (a: T, b: T) => number) {
    // FIXME sort function type
    let res = this._value.sort(fn)
    this._change(null)
    return res
  }

  splice(start: number, deleteCount: number, ...items: Array<T>) {
    // FIXME arguments
    let res = this._value.splice(start, deleteCount, ...items)
    this._change(null)
    this._change('length')
    return res
  }

  reverse() {
    let res = this._value.reverse()
    this._change(null)
    return res
  }

  //////////////////////////////////////

  map(fn: any) { // FIXME this is ugly
    return this.tf({ get: arr => Array.isArray(arr) ? arr.map(fn) : [] })
  }

  filter(fn: any) { // FIXME this is ugly
    return this.tf({ get: arr => Array.isArray(arr) ? arr.filter(fn) : [] })
  }

}


/**
 * An Observable based on another observable, watching only its subpath.
 */
export class PropObservable<T, U> extends Observable<U> {

  _prop : string
  _obs : Observable<T>
  _unregister: () => void

  constructor(obs : Observable<T>, prop : string) {
    super(undefined)
    this._prop = "" + prop // force prop as a string
    this._obs = obs
    this._unregister = null
  }

  get() {
    if (!this._unregister) this._refresh()
    return this._value
  }

  getp(prop: string) {
    if (!this._unregister) {
      this._refresh()
    }
    return pathget(this._value, prop)
  }

  set(value: U): boolean {
    return this._obs.setp(this._prop, value)
  }

  setp<V>(prop: string, value: V): boolean {
    return this._obs.setp<V>(pathjoin(this._prop, prop), value)
  }

  _refresh(ancestry?: number, prop: string = '') {
    const old_val = this._value
    const new_val = this._value = this._obs.getp<U>(this._prop)

    // if changed_prop is a sub property of this prop, then we will change
    // automaticaly.
    // if changed_prop is a parent property, then we're going to try to refresh
    // but the observers won't necessarily be called, since we may not have
    // changed.
    const changed = ancestry === IS_ANCESTOR || old_val !== new_val
    const subprop = ancestry === IS_ANCESTOR ? prop.replace(this._prop + '.', '') : null

    if (changed) {
      for (let ob of this._observers)
        ob(new_val, subprop)
    }
  }

  addObserver(fn: Observer<U>) {
    if (!this._unregister) {
      this._unregister = this._obs.addObserver((value, prop) => {
        // Link observable changes to us.
        const ancestry = _get_ancestry(this._prop, prop)
        // console.log(ancestry, this._prop, prop)
        // if changed_prop has nothing to do with us, then just ignore the set.
        if (ancestry === IS_UNRELATED) return

        this._refresh(ancestry, prop)
      })
    }

    return super.addObserver(fn)
  }

}


export class TransformObservable<T, U> extends Observable<U> {

  _transformer: Transformer<T, U>
  _obs: Observable<T>
  _unregister: () => void

  constructor(obs: Observable<T>, transformer: Transformer<T, U>) {
    super(undefined) // !!!
    this._obs = obs
    this._transformer = transformer
    this._unregister = null
  }

  get() {

    if (!this._unregister) {
      // Nobody is watching this observable, so it is not up to date.
      this._value = this._transformer.get(this._obs.get())
    }

    return this._value
  }

  _refresh(value: T) {
    const old_val = this._value
    const new_val = this._value = this._transformer.get(value)
    const changed = old_val !== new_val

    if (changed) {
      for (let ob of this._observers) ob(new_val, null)
    }
  }

  /**
   * The transform observable does not set itself directly. Instead, it
   * forwards the set to its observed.
   */
  set(value: U): boolean {

    return this._obs.set(this._transformer.set(value))

  }

  setp<V>(prop: string, value: V) : boolean {
    throw new Error('transformers cannot set subpath')
  }

  addObserver(fn: Observer<U>) {
    if (!this._unregister) {
      this._unregister = this._obs.addObserver(value => this._refresh(value))
    }
    return super.addObserver(fn)
  }

  removeObserver(fn: Observer<U>) {
    super.removeObserver(fn)
    if (this._observers.length === 0) {
      this._unregister()
      this._unregister = null
    }
  }

}


/**
 * An observable based on several observables and a transformation function.
 */
export class DependentObservable<T> extends Observable<T> {

  _resolved: Array<any>
  _unregister: Array<() => void>
  _deps: Array<Observable<any>>
  _fn: (...arg: Array<any>) => T

  _ignore_updates: boolean

  constructor(deps: any[], fn: (...arg: any[]) => T) {
    super(undefined)

    this._resolved = null
    this._unregister = []
    this._deps = deps
    this._fn = fn

    this._ignore_updates = false
  }

  get(): T {
    if (this._observers.length === 0) this._refresh()
    return this._value
  }

  getp<U>(prop: string): U {
    if (this._observers.length === 0) this._refresh()
    return pathget(this._value, prop) as U
  }

  set(v: T): boolean {
    throw new Error('cannot set on a DependentObservable')
  }

  setp<V>(p: string, v: V): boolean {
    throw new Error('cannot set on a DependentObservable')
  }

  _refresh() {
    if (this._ignore_updates) return
    const old_val = this._value
    const resolved = this._resolved || this._deps.map(dep => Get(dep))
    const new_val = this._value = this._fn(...resolved)
    const obs = this._observers
    var i = 0

    if (old_val === new_val) return

    for (i = 0; i < obs.length; i++) obs[i](new_val, '')
  }

  addObserver(fn: Observer<T>) {
    if (this._observers.length === 0) {
      // Set up the observing.

      this._resolved = []
      let idx = -1
      this._ignore_updates = true
      for (let obs of this._deps) {
        idx++

        if (!(obs instanceof Observable)) {
          this._resolved.push(obs)
          continue
        }

        this._unregister.push(obs.addObserver(((idx: number, value: any) => {
          this._resolved[idx] = value
          this._refresh()
        }).bind(this, idx)))
      }
      this._ignore_updates = false
      this._refresh()
    }

    return super.addObserver(fn)
  }

  removeObserver(fn: Observer<T>) {
    super.removeObserver(fn)
    if (this._observers.length === 0) {
      for (let un of this._unregister) un()
      this._unregister = []
      this._resolved = null
    }
  }

}


/**
 * This is a convenience function.
 * There are two ways of calling it :
 *
 * 	- With a single argument, it will return an observable, whether the argument
 * 		was observable or not. Which is to say that in that case, we have
 * 		o(Any|Observable) -> Observable
 *
 * 	- With several arguments, it expects the last one to be a computation function
 * 		and the first ones its dependencies. If none of the dependency is Observable,
 * 		just return the result of the computation. Otherwise return an observable
 * 		that depends on other observables.
 */
export function o(...args : Array<any>) {
  let l = args.length

  // Just creating an observable.
  if (l === 1) {
    let a = args[0]
    if (a instanceof Observable) return a
    return new Observable(a)
  }

  let fn = args[args.length - 1]
  let deps = Array.prototype.slice.call(arguments, 0, arguments.length - 1)

  // If there is no observer, directly return the result of applying the function
  // with its arguments.
  // if (!has_obs) return fn.apply(this, deps)

  let res = new DependentObservable(
    deps,
    fn
  )

  return res
}

/**
 * Get the current value of the observable, or the value itself if the
 * provided parameter was not an observable.
 */
export function Get(v : any) : any {
  if (v instanceof Observable) return v.get()
  return v
}


/**
 * Setup an onchange event on the observable, or just call the
 * onchange value once if the provided o is not an observable.
 */
export function observe<T>(o: O<T>, fn: Observer<T>) {
  if (o instanceof Observable) return o.addObserver(fn)
  // the object is not observable, so the onchange value is immediately called.
  fn(o as T)
  // return a function that does nothing, since nothing is being registered.
  return function() { }
}

export function Or(...args : Array<Observable<any>>) : Observable<boolean> {
  return new DependentObservable<boolean>(args, (...args: any[]) => {
    for (var i = 0; i < args.length; i++)
      if (args[i]) return true
    return false
  })
}

export function And(...args: Array<Observable<any>>) : Observable<boolean> {
  return new DependentObservable<boolean>(args, (...args: any[]) => {
    for (var i = 0; i < args.length; i++)
      if (!args[i]) return false
    return true
  })
}
