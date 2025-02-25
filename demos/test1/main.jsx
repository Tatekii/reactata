import { useState } from "react"
import ReactDOM from "react-dom"

const root = ReactDOM.createRoot(document.getElementById("root"))

function App() {
	const [str, setStr] = useState('HELLO WORLD')
	return <h1>{str}</h1>
}

// const jsx = (<h1>hello WORLD</h1>)

root.render(<App />)
