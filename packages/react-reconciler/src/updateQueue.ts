import { Action } from "shared/ReactTypes"
import { Update } from "./fiberFlags"
import { Dispatch } from "react/src/currentDispatcher"
import { Lane } from "./fiberLane"

// 定义 Update 数据结构
export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
}

// 定义 UpdateQueue 数据结构
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action,
		next: null,
	}
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
	return {
		shared: {
			pending: null,
		},
		dispatch: null,
	}
}

/**
 * 将Update对象入队
 * @param updateQueue
 * @param update
 */
export const enqueueUpdate = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
	updateQueue.shared.pending = update
}

/**
 * 执行Update
 * @param baseState 更新前的state
 * @param pendingUpdate 更新的对象
 * @returns 返回更新完之后的state
 */
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memorizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState,
	}
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action
		// 判断Update中的action类型，是函数的话讲更新前的state传入执行
		if (action instanceof Function) {
			result.memorizedState = action(baseState)
		} else {
			result.memorizedState = action
		}
	}
	return result
}
