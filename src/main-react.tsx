import * as React from "react"
import * as ReactDOM from "react-dom"
require("./main-web")

class HomeMenu extends React.Component {
    render() {
        return (
            <div>
            <h1>naubino</h1>
            <ul>
                <li><span>oh</span> <span>la la</span></li>
            </ul>
            </div>
        )
    }
}

ReactDOM.render(<HomeMenu />, document.getElementById("menu"))