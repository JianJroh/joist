let scheduler: Promise<any> | null = null;

export type EffectFn = () => void;

const effects = new Set<EffectFn>();

export function observe(
  base: ClassAccessorDecoratorTarget<any, any>,
  _: ClassAccessorDecoratorContext
): ClassAccessorDecoratorResult<any, any> {
  return {
    set(value: unknown) {
      if (!scheduler) {
        scheduler = Promise.resolve().then(() => {
          scheduler = null;

          for (let effect of effects) {
            effect();
          }
        });
      }

      base.set.call(this, value);
    },
  };
}

export function effect(cb: EffectFn): () => void {
  effects.add(cb);

  return () => {
    effects.delete(cb);
  };
}
