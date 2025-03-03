import { Action } from "shared/ReactTypes"
import { Update } from "./fiberFlags"
import { Dispatch } from "react/src/currentDispatcher"
import { Lane } from "./fiberLanes"

// 定义 Update 数据结构
export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
	lane: Lane
}

// 定义 UpdateQueue 数据结构
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: Dispatch<State> | null
}

/** 新建Update对象 */
export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
	return {
		action,
		next: null,
		lane,
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
	const pending = updateQueue.shared.pending

	if (pending === null) {
		update.next = update
	} else {
		update.next = pending.next
		pending.next = update
	}
	// pending 指向 update 环状链表的最后一个节点
	updateQueue.shared.pending = update
}

/**
 * 执行Update
 * @param baseState 更新前的state
 * @param pendingUpdate 更新的对象
 * @param renderLane 更新的优先级
 * @returns 返回更新完之后的state
 */
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): { memorizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState,
	}

	if (pendingUpdate !== null) {
		const first = pendingUpdate.next
		let pending = first as Update<any>

		do {
			const updateLane = pending.lane

			if (updateLane == renderLane) {

				const action = pending.action
				
				if (action instanceof Function) {
					// action 是回调函数
					baseState = action(baseState)
				} else {
					// action 是状态值
					baseState = action
				}
			} else {
				if (__DEV__) {
					console.error("不应该进入 updateLane !== renderLane 逻辑")
				}
			}
			pending = pending.next as Update<any>
		} while (pending !== first)
	}

	result.memorizedState = baseState

	return result
}
