// packages/shared/ReactTypes.ts
export type Type = any
export type Key = any
export type Props = Record<string,any>
export type Ref = any
export type ElementType = any

export interface ReactElementType {
	$$typeof: symbol | number
	key: Key
	props: Props
	ref: Ref
	type: ElementType
}


export type Action<State> = State | ((prevState: State) => State);
