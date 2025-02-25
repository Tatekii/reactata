import { Dispatch, Dispatcher } from "react/src/currentDispatcher"
import { FiberNode } from "./fiber"
import internals from "shared/internals"
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from "./updateQueue"
import { Action } from "shared/ReactTypes"
import { scheduleUpdateOnFiber } from "./workLoop"

const { currentDispatcher } = internals

export interface Hook {
	memorizedState: any; // 保存 Hook 的数据
	queue: any;
	next: Hook | null;
}

// 当前正在处理的 FiberNode
let currentlyRenderingFiber: FiberNode | null = null

// Hooks 链表中当前正在处理的 Hook
let workInProgressHook: Hook | null = null

/**
 * 执行函数组件
 * @param workInProgress
 * @returns
 */
export function renderWithHooks(workInProgress: FiberNode) {
	currentlyRenderingFiber = workInProgress
	workInProgress.memorizedState = null

	const current = workInProgress.alternate

	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate
	} else {
		// 首屏
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const Component = workInProgress.type

	const props = workInProgress.pendingProps

	const children = Component(props)

	currentlyRenderingFiber = null
	workInProgressHook = null

	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
}

function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
	// 当前正在处理的 useState
	const hook = mountWorkInProgressHook()
	// 获取当前 useState 对应的 Hook 数据
	let memorizedState

	if (initialState instanceof Function) {
		memorizedState = initialState()
	} else {
		memorizedState = initialState
	}

	hook.memorizedState = memorizedState

	const queue = createUpdateQueue<State>()
	hook.queue = queue

	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
	queue.dispatch = dispatch

	return [memorizedState, dispatch]
}

function updateState<T>(initialState: T | (() => T)): [T, Dispatch<T>] {
	// TODO
	throw new Error("Function not implemented.")
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memorizedState: null,
		queue: null,
		next: null,
	}
	if (workInProgressHook == null) {
		// 第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = hook
			currentlyRenderingFiber.memorizedState = workInProgressHook
		} else {
			// currentlyRenderingFiber == null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error("Hooks 只能在函数组件中执行")
		}
	} else {
		// mount 时的其他 hook
		// 将当前处理的 Hook.next 指向新建的 hook，形成 Hooks 链表
		workInProgressHook.next = hook
		// 更新当前处理的 Hook
		workInProgressHook = hook
	}
	return workInProgressHook
}

function dispatchSetState<State>(fiber: FiberNode, updateQueue: UpdateQueue<State>, action: Action<State>) {

	const update = createUpdate(action)

	enqueueUpdate(updateQueue, update)
	// 调度更新
	scheduleUpdateOnFiber(fiber)
}
