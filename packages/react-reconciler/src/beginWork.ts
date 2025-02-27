import { ReactElementType } from "shared/ReactTypes"
import { FiberNode } from "./fiber"
import { UpdateQueue, processUpdateQueue } from "./updateQueue"
import { Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags"
import { reconcileChildFibers, mountChildFibers } from "./childFiber"
import { renderWithHooks } from "./fiberHooks"

/**
 *
 * @param workInProgress
 * @returns
 */
export const beginWork = (workInProgress: FiberNode) => {
	switch (workInProgress.tag) {
		// 应用根节点
		case HostRoot:
			return updateHostRoot(workInProgress)
		// 原生DOM节点
		case HostComponent:
			return updateHostComponent(workInProgress)
		// 文字节点
		case HostText:
			return updateHostText()
		// 函数组件
		case FunctionComponent:
			return updateFunctionComponent(workInProgress)

		// Fragment
		case Fragment:
			return updateFragment(workInProgress)
		default:
			if (__DEV__) {
				console.warn("beginWork 未实现的类型", workInProgress.tag)
			}
			break
	}
}

function updateHostRoot(workInProgress: FiberNode) {
	const baseState = workInProgress.memorizedState
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>
	const pending = updateQueue.shared.pending
	// 清空更新链表

	updateQueue.shared.pending = null

	// 计算待更新状态的最新值
	const { memorizedState } = processUpdateQueue(baseState, pending)

	workInProgress.memorizedState = memorizedState

	// 处理子节点的更新逻辑
	const nextChildren = workInProgress.memorizedState
	reconcileChildren(workInProgress, nextChildren)

	// 返回新的子节点
	return workInProgress.child
}

function updateHostComponent(workInProgress: FiberNode) {
	const nextProps = workInProgress.pendingProps
	const nextChildren = nextProps.children
	reconcileChildren(workInProgress, nextChildren)
	return workInProgress.child
}

function updateHostText() {
	// 没有子节点，直接返回 null
	return null
}

function reconcileChildren(workInProgress: FiberNode, children?: ReactElementType) {
	const current = workInProgress.alternate

	if (!current) {
		// 首屏渲染阶段
		workInProgress.child = mountChildFibers(workInProgress, null, children)
	} else {
		// 更新阶段
		workInProgress.child = reconcileChildFibers(workInProgress, current?.child, children)
	}
}

function updateFunctionComponent(workInProgress: FiberNode) {
	const nextChildren = renderWithHooks(workInProgress)
	reconcileChildren(workInProgress, nextChildren)
	return workInProgress.child
}

function updateFragment(workInProgress: FiberNode) {
	const nextChildren = workInProgress.pendingProps
	reconcileChildren(workInProgress, nextChildren as any)
	return workInProgress.child
}
