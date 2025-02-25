import { useState } from "react"
import ReactDOM from "react-dom"

const root = ReactDOM.createRoot(document.getElementById("root"))

let timer
let count = 0

function App() {
	const [str, setStr] = useState('HELLO WORLD')

	if(!timer && count<1){
		count ++
		timer = setTimeout(() => {
			setStr(()=>'SHIITTTT!')
			setStr(()=>'SHIITTTT2!')
			clearTimeout(timer)
			timer = null
	}, 2000);
	}

	return <h1>{str}</h1>
}

// const jsx = (<h1>hello WORLD</h1>)

root.render(<App value={'123'}/>)