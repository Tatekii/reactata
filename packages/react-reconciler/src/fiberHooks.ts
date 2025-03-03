import { Dispatch, Dispatcher } from "react/src/currentDispatcher"
import { FiberNode } from "./fiber"
import internals from "shared/internals"
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from "./updateQueue"
import { Action } from "shared/ReactTypes"
import { scheduleUpdateOnFiber } from "./workLoop"
import { Lane, NoLane } from "./fiberLanes"
import { requestUpdateLanes } from "./fiberLanes"

const { currentDispatcher } = internals

export interface Hook {
	memorizedState: any // 保存 Hook 的数据
	queue: any
	next: Hook | null
}

// 当前正在处理的 FiberNode
let currentlyRenderingFiber: FiberNode | null = null
// Hooks 链表中当前正在处理的 Hook
let workInProgressHook: Hook | null = null

//
let currentHook: Hook | null = null

// 当期渲染的优先级
let renderLane: Lane = NoLane

/**
 * 执行函数组件
 * @param workInProgress
 * @returns
 */
export function renderWithHooks(workInProgress: FiberNode, lane: Lane) {

	currentlyRenderingFiber = workInProgress

	renderLane = lane

	workInProgress.memorizedState = null

	const current = workInProgress.alternate

	if (__DEV__) {
		console.log(current !== null ? "renderWithHooks组件更新" : "renderWithHooks首屏渲染")
	}

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
	currentHook = null
	renderLane = NoLane

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

	if (__DEV__) {
		console.log("mount state", hook, initialState)
	}

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

function updateState<State>(initialState: State | (() => State)): [State, Dispatch<State>] {
	// 当前正在工作的 useState
	const hook = updateWorkInProgressHook()

	if (__DEV__) {
		console.log("update state", hook, initialState)
	}

	// 计算新 state
	const queue = hook.queue as UpdateQueue<State>
	const pending = queue.shared.pending
	queue.shared.pending = null;

	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(hook.memorizedState, pending, renderLane)
		hook.memorizedState = memorizedState
	}
	return [hook.memorizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
	// hook 链表
	let nextCurrentHook: Hook | null

	if (currentHook == null) {
		// 这是函数组件 update 时的第一个 hook
		const current = (currentlyRenderingFiber as FiberNode).alternate

		if (current === null) {
			nextCurrentHook = null
		} else {
			nextCurrentHook = current.memorizedState
		}
	} else {
		nextCurrentHook = currentHook.next
	}

	if (nextCurrentHook == null) {
		throw new Error(`组件 ${currentlyRenderingFiber?.type} 本次执行时的 Hooks 比上次执行多`)
	}

	currentHook = nextCurrentHook as Hook

	const newHook: Hook = {
		memorizedState: currentHook.memorizedState,
		queue: currentHook.queue,
		next: null,
	}

	if (workInProgressHook == null) {
		// update 时的第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = newHook

			currentlyRenderingFiber.memorizedState = workInProgressHook
		} else {
			// currentlyRenderingFiber == null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error("Hooks 只能在函数组件中执行")
		}
	} else {
		// update 时的其他 hook

		workInProgressHook.next = newHook
		// 链接链表并移动指针
		workInProgressHook = newHook
	}

	return workInProgressHook
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
	
	const lane = requestUpdateLanes()

	const update = createUpdate(action, lane)

	enqueueUpdate(updateQueue, update)
	// 调度更新
	scheduleUpdateOnFiber(fiber, lane)
}
