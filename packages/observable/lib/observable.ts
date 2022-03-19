import { getObservableAttributes } from './attribute';

export class Change<T = any> {
  constructor(public value: T, public previousValue: T | undefined, public firstChange: boolean) {}
}

export type Changes = Record<string | symbol, Change>;

export interface OnPropertyChanged {
  onPropertyChanged(changes: Changes): void;
}

const PROPERTY_KEY = 'observedProperties';

export function getObservableProperties(c: any): Array<string | symbol> {
  return c[PROPERTY_KEY] || [];
}

export interface ObservableBase {
  propChanges: Changes;
  propChange: Promise<void> | null;
  initializedChanges: Set<string | symbol>;

  definePropChange(key: string | symbol, propChange: Change): Promise<void>;
  onPropertyChanged?(changes: Changes): void;
}

export function observe(target: any, key: string) {
  target.constructor[PROPERTY_KEY] = target.constructor[PROPERTY_KEY] || [];
  target.constructor[PROPERTY_KEY].push(key);
}

export function observable<T extends new (...args: any[]) => any>(Base: T) {
  const properties = getObservableProperties(Base);
  const attributes = getObservableAttributes(Base);
  const descriptors = createPropertyDescripors(properties);

  return class Observable extends Base implements ObservableBase {
    propChanges: Changes = {};
    propChange: Promise<void> | null = null;
    initializedChanges = new Set<string | symbol>();

    definePropChange = definePropChange;

    constructor(...args: any[]) {
      super(...args);

      for (let prop in descriptors) {
        Reflect.set(this, createPrivateKey(prop), Reflect.get(this, prop));
      }

      Object.defineProperties(this, descriptors);
    }

    connectedCallback(this: HTMLElement) {
      attributes.forEach((attribute) => {
        const val = this.getAttribute(attribute);

        if (val !== null) {
          Reflect.set(this, attribute, parseAttribute(val));
        }
      });

      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }

    attributeChangedCallback(this: HTMLElement, name: string, oldVal: string, newVal: string) {
      Reflect.set(this, name, parseAttribute(newVal));

      if (super.attributeChangedCallback) {
        super.attributeChangedCallback(name, newVal, oldVal);
      }
    }

    onPropertyChanged(changes: Changes) {
      if (this instanceof HTMLElement) {
        for (let change in changes) {
          if (attributes.includes(change)) {
            this.setAttribute(change, String(changes[change].value));
          }
        }
      }

      if (super.onPropertyChanged) {
        super.onPropertyChanged(changes);
      }
    }
  };
}

function parseAttribute(val: string): string | number | boolean {
  const number = Number(val);

  if (!isNaN(number)) {
    return number;
  }

  if (val === 'true' || val === 'false') {
    return Boolean(val);
  }

  return val;
}

function createPrivateKey(key: string | symbol) {
  return `__${key.toString()}`;
}

function createPropertyDescripors(
  props: Array<string | symbol>
): Record<string, PropertyDescriptor> {
  const descriptors: Record<string | symbol, PropertyDescriptor> = {};

  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const privateKey = createPrivateKey(prop);

    descriptors[prop] = {
      set(this: ObservableBase, val) {
        const prevVal = Reflect.get(this, privateKey);

        if (prevVal !== val) {
          this.definePropChange(prop, new Change(val, prevVal, true));
        }

        return Reflect.set(this, privateKey, val);
      },
      get() {
        return Reflect.get(this, privateKey);
      },
    };
  }

  return descriptors;
}

function definePropChange(
  this: ObservableBase,
  key: string | symbol,
  propChange: Change
): Promise<void> {
  if (!this.propChanges[key]) {
    this.propChanges[key] = propChange;
  }

  this.propChanges[key].value = propChange.value;

  if (!this.propChange) {
    // If there is no previous change defined set it up
    this.propChange = Promise.resolve().then(() => {
      // run onPropChanges here. This makes sure we capture all changes

      // keep track of whether or not this is the first time a given property has changes
      for (let change in this.propChanges) {
        this.propChanges[change].firstChange = !this.initializedChanges.has(change);

        this.initializedChanges.add(change);
      }

      if (this.onPropertyChanged) {
        this.onPropertyChanged(this.propChanges);
      }

      // reset for next time
      this.propChanges = {};
      this.propChange = null;
    });
  }

  return this.propChange;
}
