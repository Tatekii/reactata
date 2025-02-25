import { Action } from "shared/ReactTypes"
import { Update } from "./fiberFlags"

export interface Update<State> {
	action: Action<State>
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action,
	}
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
	return {
		shared: {
			pending: null,
		},
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
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
	}
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action
		// 判断Update中的action类型，是函数的话讲更新前的state传入执行
		if (action instanceof Function) {
			result.memoizedState = action(baseState)
		} else {
			result.memoizedState = action
		}
	}
	return result
}
