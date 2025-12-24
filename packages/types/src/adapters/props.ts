export interface AbstractType<T> {
    default?: T;
}

export interface StringType extends AbstractType<string> {
    type: 'string';
}

export interface BooleanType extends AbstractType<boolean> {
    type: 'boolean';
}

export interface NumberType extends AbstractType<number> {
    type: 'number';
}

export interface EnumType<T extends readonly string[]> extends AbstractType<T[number]> {
    type: 'enum';
    options: T;
}

export interface ObjectType<T extends Record<string, unknown>> extends AbstractType<T> {
    type: 'object';
    props: { [K in keyof T]: AbstractType<T[K]> };
}

export function string(): StringType {
    return {
        type: 'string',
        default: '',
    };
}

export function boolean(): BooleanType {
    return {
        type: 'boolean',
        default: false,
    };
}

export function number(): NumberType {
    return {
        type: 'number',
        default: 0,
    };
}

function enum_<U extends string, T extends Readonly<[U, ...U[]]>>(options: T): EnumType<T> {
    return {
        type: 'enum',
        default: options[0],
        options,
    };
}
export { enum_ as enum };

export function object<T extends Record<string, unknown>>(props: {
    [K in keyof T]: AbstractType<T[K]>;
}): ObjectType<T> {
    const defaultValue = Object.fromEntries(
        Object.entries(props).map(([key, value]) => [
            key,
            (value as AbstractType<unknown>).default,
        ]),
    );

    return {
        type: 'object',
        props,
        default: defaultValue as T,
    };
}

export type Infer<T> = T extends AbstractType<infer U> ? U : never;
