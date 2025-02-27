import { FiberNode, FiberRootNode } from "./fiber"
import { HostRoot } from "./workTags"
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from "./updateQueue"
import { ReactElementType } from "shared/ReactTypes"
import { scheduleUpdateOnFiber } from "./workLoop"
import { Container } from "react-dom/src/hostConfig"
import { requestUpdateLanes } from "./fiberLanes"

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null)
	const root = new FiberRootNode(container, hostRootFiber)
	hostRootFiber.updateQueue = createUpdateQueue()
	console.log("createContainer", root)

	return root
}

export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
	const hostRootFiber = root.current

	const lane = requestUpdateLanes()

	const update = createUpdate<ReactElementType | null>(element, lane)

	enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>, update)

	scheduleUpdateOnFiber(hostRootFiber, lane)

	return element
}
