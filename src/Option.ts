// Option type inspired by Scala Option

export abstract class Option<T> {
  
  abstract get(): T
  
  abstract getOrElse(other: () => T): T
  
  abstract isDefined(): boolean
  
  isEmpty(): boolean {
    return !this.isDefined()
  }
  
  abstract map<V>(f: (t: T) => V): Option<V>

  abstract filter(f: (t: T) => boolean): Option<T>

  abstract forEach(f: (t: T) => void): void

}

export class Some<T> extends Option<T> {
  private value: T

  constructor(v: T) {
    super()
    if(v === undefined || v === null) {
      throw new TypeError("Some class must be created from defined value")
    }
    this.value = v
  }

  get(): T {
    return this.value
  }

  isDefined() {
    return true
  }

  getOrElse(other: () => T) {
    return this.value
  }

  map<V>(f: (t: T) => V) {
    return new Some(f(this.value))
  }

  filter(f: (t: T) => boolean): Option<T> {
    if(f(this.value)) {
      return this
    } else {
      return new None<T>()
    }
  }

  forEach(f: (t: T) => void): void {
    f(this.value)
  }

}

export class None<T> extends Option<T> {
  
  constructor() {
    super()
  }

  get(): T {
    throw new Error("Option is empty")
  }

  isDefined() {
    return false
  }

  getOrElse(other: () => T) {
    return other()
  }

  map<V>(f: (t: T) => V) {
    return this
  }

  filter(f: (t: T) => boolean): Option<T> {
    return this
  }

  forEach(f: (t: T) => void): void {
  }

}