import { createContainer, updateContainer } from "react-reconciler/src/fiberReconciler"
import { Container } from "./hostConfig"
import { ReactElementType } from "shared/ReactTypes"
import { initEvent, validEventTypeList } from "./SyntheticEvent"

// 实现 ReactDOM.createRoot(root).render(<App />);
export function createRoot(container: Container) {
	const root = createContainer(container)
	return {
		render(element: ReactElementType) {
			for (const ev of validEventTypeList) {
				initEvent(container, ev)
			}
			return updateContainer(element, root)
		},
	}
}
