import { Reflect } from '../reflect';
import { Details, Result } from '../result';
import { Runtype, RuntypeBase, Static, create, innerValidate } from '../runtype';
import { enumerableKeysOf, FAILURE, SUCCESS } from '../util';

type StaticTuple<A extends readonly RuntypeBase[]> = {
  [K in keyof A]: A[K] extends RuntypeBase ? Static<A[K]> : unknown;
};

export interface Tuple<A extends readonly RuntypeBase[], RO extends boolean = true>
  extends Runtype<RO extends true ? Readonly<StaticTuple<A>> : StaticTuple<A>> {
  tag: 'tuple';
  components: A;
  isReadonly: RO;

  asReadonly(): Tuple<A, true>;
}

/**
 * Construct a tuple runtype from runtypes for each of its elements.
 */
function InternalTuple<T extends readonly RuntypeBase[], RO extends boolean = true>(
  isReadonly: RO,
  ...components: T
): Tuple<T, RO> {
  const self = ({ tag: 'tuple', isReadonly, components } as unknown) as Reflect;

  return withExtraModifierFuncs(
    create<any>((xs, visited) => {
      if (!Array.isArray(xs)) return FAILURE.TYPE_INCORRECT(self, xs);

      if (xs.length !== components.length)
        return FAILURE.CONSTRAINT_FAILED(
          self,
          `Expected length ${components.length}, but was ${xs.length}`,
        );

      const keys = enumerableKeysOf(xs);
      const results: Result<unknown>[] = keys.map(key =>
        innerValidate(components[key as any], xs[key as any], visited),
      );
      const details = keys.reduce<{ [key: number]: string | Details } & (string | Details)[]>(
        (details, key) => {
          const result = results[key as any];
          if (!result.success) details[key as any] = result.details || result.message;
          return details;
        },
        [],
      );

      if (enumerableKeysOf(details).length !== 0) return FAILURE.CONTENT_INCORRECT(self, details);
      else return SUCCESS(xs);
    }, self),
  );
}

export function Tuple<T extends readonly RuntypeBase[], RO extends boolean>(
  ...components: T
): Tuple<T, false> {
  return InternalTuple(false, ...components);
}

function withExtraModifierFuncs<A extends readonly RuntypeBase[], RO extends boolean>(
  A: any,
): Tuple<A, RO> {
  A.asReadonly = asReadonly;

  return A;

  function asReadonly(): Tuple<A, true> {
    return InternalTuple(true, ...A.components) as any;
  }
}
