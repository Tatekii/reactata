import { useState } from "react"
import ReactDOM from "react-dom"

const root = ReactDOM.createRoot(document.getElementById("root"))

let timer
let count = 0

function App() {
	const [str, setStr] = useState('HELLO WORLD')
	// const [str1, setStr1] = useState('HELLO WORLD111')



	// if(!timer && count<1){
	// 	count ++
	// 	timer = setTimeout(() => {
	// 		setStr(()=>'SHIITTTT!')
	// 		setStr1(()=>'SHIITTTT!!!!!')
	// 		// setStr(()=>'SHIITTTT!!!!!')
	// 		clearTimeout(timer)
	// 		timer = null
	// }, 2000);
	// }

	return <button style="color:red" className='xxx' nam1e='666' onClick={()=>{console.log('click h1')}}>
		{str}
		</button>
}

// const jsx = (<h1>hello WORLD</h1>)

root.render(<App value={'123'}/>)