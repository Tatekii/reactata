// packages/react-reconciler/src/beginWork.ts
import { ReactElementType } from "shared/ReactTypes"
import { FiberNode } from "./fiber"
import { UpdateQueue, processUpdateQueue } from "./updateQueue"
import { HostComponent, HostRoot, HostText } from "./workTags"
import { reconcileChildFibers, mountChildFibers } from "./childFiber"

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
		default:
			if (__DEV__) {
				console.warn("beginWork 未实现的类型", workInProgress.tag)
			}
			break
	}
}

function updateHostRoot(workInProgress: FiberNode) {
	const baseState = workInProgress.memoizedState
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>
	const pending = updateQueue.shared.pending
	// 清空更新链表

	updateQueue.shared.pending = null

	// 计算待更新状态的最新值
	const { memoizedState } = processUpdateQueue(baseState, pending)
	workInProgress.memoizedState = memoizedState

	// 处理子节点的更新逻辑
	const nextChildren = workInProgress.memoizedState
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
