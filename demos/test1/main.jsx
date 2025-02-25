import ReactDOM from "react-dom"

const root = ReactDOM.createRoot(document.getElementById("root"))

function App() {
	return <h1>hello WORLD from function component</h1>
}

// const jsx = (<h1>hello WORLD</h1>)

root.render(<App/>)
