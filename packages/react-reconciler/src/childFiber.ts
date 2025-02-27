import { Props, ReactElementType } from "shared/ReactTypes"
import { FiberNode, createFiberFromElement, createWorkInProgress } from "./fiber"
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import { HostText } from "./workTags"
import { ChildDeletion, Placement } from "./fiberFlags"


interface ExistingChildren extends Map<string,FiberNode>{}

function ChildReconciler(shouldTrackSideEffects: boolean) {
	/**
	 * 协调单个element
	 * @param returnFiber
	 * @param currentFiber
	 * @param element
	 * @returns
	 */
	function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElementType) {
		// 组件的更新阶段
		while (currentFiber !== null) {
			if (currentFiber.key === element.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// NOTE key 和 type 都相同，复用旧的 Fiber 节点
						const existing = useFiber(currentFiber, element.props)
						existing.return = returnFiber
						// 删除余下所有兄弟节点
						deleteRemainingChildren(currentFiber, currentFiber.sibling)

						return existing
					}
					// NOTE key 相同，但 type 不同，删除旧的 Fiber 节点
					// 删除余下所有兄弟节点
					deleteRemainingChildren(currentFiber, currentFiber.sibling)
					break
				} else {
					if (__DEV__) {
						console.warn("还未实现的 React 类型", element)
					}
				}
			} else {
				// NOTE key不同，删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber)
				// 移动到兄弟节点
				currentFiber = currentFiber.sibling
			}
		}

		// 创建新的 Fiber 节点
		const fiber = createFiberFromElement(element)
		fiber.return = returnFiber
		return fiber
	}

	/**
	 * 协调单个文本
	 * @param returnFiber
	 * @param currentFiber
	 * @param content
	 * @returns
	 */
	function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
		while (currentFiber !== null) {
			// 组件的更新阶段
			if (currentFiber.tag === HostText) {
				// 复用旧的 Fiber 节点
				const existing = useFiber(currentFiber, { content })
				existing.return = returnFiber
				// 删除余下所有兄弟节点
				deleteRemainingChildren(currentFiber, currentFiber.sibling)
				return existing
			} else {
				// 删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber)
				// 移动指针
				currentFiber = currentFiber.sibling
			}
		}
		// 创建新的 Fiber 节点
		const fiber = new FiberNode(HostText, { content }, null)
		fiber.return = returnFiber
		return fiber
	}

	/**
	 * 多节点diff
	 * @param returnFiber
	 * @param currentFirstChild
	 * @param newChild
	 * @returns
	 */
	function reconcileChildrenArray(returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild: any[]) {
		// 最后一个可复用 Fiber 在 current 中的 index
		let lastPlacedIndex: number = 0
		// 创建的第一个新 Fiber
		let firstNewFiber: FiberNode | null = null
		// 创建的最后一个新 Fiber
		let lastNewFiber: FiberNode | null = null

		// 保存current的子节点到Map中，以key为键
		const existingChildren: ExistingChildren = new Map()

		let current = currentFirstChild

		while (current !== null) {
			// NOTE fallback到了index
			const keyToUse = current.key !== null ? current.key : current.index.toString()

			existingChildren.set(keyToUse, current)

			current = current.sibling
		}

		// 遍历workInProgress 的子节点
		for (let i = 0; i < newChild.length; i++) {
			const after = newChild[i]

			// 查找有无可复用节点，没有则新建
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after)

			if (newFiber == null) {
				continue
			}

			newFiber.index = i
			newFiber.return = returnFiber

			// 新建的节点也作为一条链表
			if (lastNewFiber == null) {
				lastNewFiber = newFiber
				firstNewFiber = newFiber
			} else {
				lastNewFiber.sibling = newFiber
				lastNewFiber = lastNewFiber.sibling
			}

			if (!shouldTrackSideEffects) {
				continue
			}

			const current = newFiber.alternate
			if (current !== null) {
				// 更新阶段
				// 对比新旧节点的位置
				const oldIndex = current.index
				if (oldIndex < lastPlacedIndex) {
					// 标记移动
					newFiber.flags |= Placement
					continue
				} else {
					// 在该节点左边都是可复用的
					lastPlacedIndex = oldIndex
				}
			} else {
				// 首屏渲染阶段，标记插入
				newFiber.flags |= Placement
			}
		}

		// 标记删除操作
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber)
		})

		// 返回子头节点
		return firstNewFiber
	}


	/**
	 * 查找有无可复用节点，没有则新建
	 * @param returnFiber 
	 * @param existingChildren 
	 * @param index 
	 * @param element 
	 * @returns 
	 */
	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {

		const keyToUse = element.key !== null ? element.key : index.toString()

		const before = existingChildren.get(keyToUse)

		// 文本节点
		if (typeof element === "string" || typeof element === "number") {
			// 可复用，复用旧的 Fiber 节点
			if (before && before.tag === HostText) {
				existingChildren.delete(keyToUse)
				return useFiber(before, { content: element + "" })
			}
			// 不可复用，创建新的 Fiber 节点
			return new FiberNode(HostText, { content: element + "" }, null)
		}

		// 组件
		if (typeof element === "object" && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					// 可复用，复用旧的 Fiber 节点
					if (before && before.type === element.type) {
						existingChildren.delete(keyToUse)
						return useFiber(before, element.props)
					}
					// 不可复用，创建新的 Fiber 节点
					return createFiberFromElement(element)

				// TODO case REACT_FRAGMENT_TYPE
				default:
					break
			}
		}

		// TODO 数组类型的element，如：<ul>{[<li/>, <li/>]}</ul>
		if (Array.isArray(element) && __DEV__) {
			console.warn("还未实现数组类型的child", element)
		}
		return null
	}

	function placeSingleChild(fiber: FiberNode) {
		// 首屏渲染且追踪副作用时，才添加更新 flags
		if (shouldTrackSideEffects && fiber.alternate == null) {
			fiber.flags |= Placement
		}
		return fiber
	}

	/**
	 * 复制 Fiber 节点
	 */
	function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
		const clone = createWorkInProgress(fiber, pendingProps)
		clone.index = 0
		clone.sibling = null
		return clone
	}

	/**
	 * 删除子节点
	 * @param returnFiber
	 * @param childToDelete
	 * @returns
	 */
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
		if (!shouldTrackSideEffects) {
			return
		}
		const deletions = returnFiber.deletions
		if (deletions === null) {
			returnFiber.deletions = [childToDelete]
			returnFiber.flags |= ChildDeletion
		} else {
			deletions.push(childToDelete)
		}
	}

	/**
	 * 删除当前节点的所有兄弟节点
	 * @param returnFiber
	 * @param currentFirstChild
	 * @returns
	 */
	function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null): void {
		if (!shouldTrackSideEffects) return
		let childToDelete = currentFirstChild
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete)
			childToDelete = childToDelete.sibling
		}
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前 fiber 的类型
		// 单个 Fragment 节点
		if (typeof newChild == "object" && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))

				default:
					if (__DEV__) {
						console.warn("未实现的 reconcile 类型", newChild)
					}
					break
			}
		}

		// 多个 节点
		if (Array.isArray(newChild)) {
			console.warn("未实现的 reconcile 类型", newChild)
		}

		// 文本节点
		if (typeof newChild == "string" || typeof newChild == "number") {
			return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild))
		}

		if (__DEV__) {
			console.warn("未实现的 reconcile 类型", newChild)
		}
		return null
	}
}

// 组件的更新阶段中，追踪副作用
export const reconcileChildFibers = ChildReconciler(true)

// 首屏渲染阶段中不追踪副作用，只对根节点执行一次 DOM 插入操作
export const mountChildFibers = ChildReconciler(false)
