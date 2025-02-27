import {
	Container,
	Instance,
	appendChildToContainer,
	commitUpdate,
	insertChildToContainer,
	removeChild,
} from "hostConfig"
import { FiberNode, FiberRootNode } from "./fiber"
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from "./fiberFlags"
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags"

let nextEffect: FiberNode | null = null

/**
 * 按照深度优先搜索，执行effect后return
 * @param finishedWork
 */
export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork

	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child

		// 有子节点并且子节点有mutation副作用
		if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
			nextEffect = child
		} else {
			// 无子节点或子节点没有mutation副作用
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect)

				const sibling: FiberNode | null = nextEffect.sibling

				if (sibling !== null) {
					nextEffect = sibling
					break up
				}

				nextEffect = nextEffect.return
			}
		}
	}
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags

	if ((flags & Placement) !== NoFlags) {
		// 插入操作
		commitPlacement(finishedWork)
		finishedWork.flags &= ~Placement
	}
	if ((flags & Update) !== NoFlags) {
		// Update
		commitUpdate(finishedWork)
		finishedWork.flags &= ~Update
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		// 删除操作
		const deletion = finishedWork.deletions

		if (deletion !== null) {
			deletion.forEach((childToDelete) => {
				commitDeletion(childToDelete)
			})
		}

		finishedWork.flags &= ~ChildDeletion
	}
}

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.log("执行 Placement 操作", finishedWork)
	}

	// 父节点
	const hostParent = getHostParent(finishedWork)

	// 插入之insertBefore的的兄弟节点
	const sibling = getHostSibling(finishedWork)

	if (hostParent) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent, sibling)
	}
}

/**
 * 获取fiber节点的DOM父节点
 * @param fiber
 * @returns
 */
const getHostParent = (fiber: FiberNode): Container | null => {
	let parent = fiber.return

	while (parent !== null) {
		const parentTag = parent.tag
		// 处理 Root 节点
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container
		}
		// 处理原生 DOM 元素节点
		if (parentTag === HostComponent) {
			return parent.stateNode as Container
		} else {
			//
			parent = parent.return
		}
	}
	if (__DEV__) {
		console.warn("未找到 host parent", fiber)
	}
	return null
}

/**
 * 获取节点的 兄弟节点
 * @param fiber
 * @returns
 */
const getHostSibling = (fiber: FiberNode) => {
	let node: FiberNode = fiber

	findSibling: while (true) {
		// 没有兄弟节点时，向上一层到Host类型节点
		while (node.sibling == null) {
			const parent = node.return
			if (parent == null || parent.tag == HostComponent || parent.tag == HostRoot) {
				return null
			}
			node = parent
		}

		// 找到兄弟节点中没有插入标记的节点
		node.sibling.return = node.return
		node = node.sibling
		while (node.tag !== HostText && node.tag !== HostComponent) {
			// 不稳定的 Host 节点不能作为目标兄弟 Host 节点
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling
			}
			if (node.child == null) {
				continue findSibling
			} else {
				node.child.return = node
				node = node.child
			}
		}

		if ((node.flags & Placement) == NoFlags) {
			return node.stateNode
		}
	}
}

/**
 *
 * @param finishedWork
 * @param hostParent
 */
const appendPlacementNodeIntoContainer = (finishedWork: FiberNode, hostParent: Container, before?: Instance) => {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			// 插入到before之前
			insertChildToContainer(finishedWork.stateNode, hostParent, before)
		} else {
			// 插入到最后
			appendChildToContainer(finishedWork.stateNode, hostParent)
		}
	} else {
		const child = finishedWork.child
		if (child !== null) {
			appendPlacementNodeIntoContainer(child, hostParent)
			let sibling = child.sibling
			while (sibling !== null) {
				appendPlacementNodeIntoContainer(sibling, hostParent)
				sibling = sibling.sibling
			}
		}
	}
}

function recordChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
	const lastOne = childrenToDelete[childrenToDelete.length - 1]
	if (!lastOne) {
		childrenToDelete.push(unmountFiber)
	} else {
		let node = lastOne.sibling
		while (node !== null) {
			if (unmountFiber == node) {
				childrenToDelete.push(unmountFiber)
			}
			node = node.sibling
		}
	}
}

// 删除节点及其子树
const commitDeletion = (childToDelete: FiberNode) => {
	if (__DEV__) {
		console.log("执行 Deletion 操作", childToDelete)
	}

	// 子树的根节点
	// 有了fragment，可能需要移除多个子节点
	// 需要移除的子树根节点
	const rootChildrenToDelete: FiberNode[] = []

	// 递归遍历子树
	commitNestedUnmounts(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber)
				// TODO 解绑ref
				return
			case HostText:
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber)
				return
			case FunctionComponent:
				//  TODO 解绑ref，执行 useUnmount
				return
			default:
				if (__DEV__) {
					console.warn("未实现的 delete 类型", unmountFiber)
				}
		}
	})

	// 移除 rootHostNode 的DOM
	if (rootChildrenToDelete.length > 0) {
		// 找到待删除子树的根节点的 parent DOM
		const hostParent = getHostParent(childToDelete) as Container

		rootChildrenToDelete.forEach((node) => {
			removeChild(node.stateNode, hostParent)
		})
	}

	childToDelete.return = null
	childToDelete.child = null
}

// 深度优先遍历 Fiber 树，执行 onCommitUnmount
const commitNestedUnmounts = (root: FiberNode, onCommitUnmount: (unmountFiber: FiberNode) => void) => {
	let node = root
	while (true) {
		onCommitUnmount(node)

		// 向下遍历
		if (node.child !== null) {
			node.child.return = node
			node = node.child
			continue
		}
		// 终止条件
		if (node === root) return

		// 向上遍历
		while (node.sibling === null) {
			// 终止条件
			if (node.return == null || node.return == root) return

			node = node.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}
