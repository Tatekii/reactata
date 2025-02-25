import { FiberNode } from "./fiber";

/**
 * 执行函数组件
 * @param workInProgress 
 * @returns 
 */
export function renderWithHooks(workInProgress: FiberNode) {

	const Component = workInProgress.type;

	const props = workInProgress.pendingProps;

	const children = Component(props);

	return children;
}