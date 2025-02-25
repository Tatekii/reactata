import currentDispatcher, { Dispatcher, resolveDispatcher } from "./src/currentDispatcher"
import {  jsxDEV,isValidElement as isValidElementFn } from "./src/jsx"

export const useState: Dispatcher["useState"] = (initialState) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useState(initialState)
}

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
}


export const createElement = jsxDEV;
export const isValidElement = isValidElementFn;
