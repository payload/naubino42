import * as React from "react"
import * as ReactDOM from "react-dom"

import * as firebase from "firebase"
require("firebase/firestore")

require("./main-web")


class NaubinoDb {
    db: firebase.firestore.Firestore

    constructor() {
        const config = {
            apiKey: "AIzaSyB1ONttuZlcdDlTxfF8g5K6liiBHKacTAg",
            authDomain: "naubinodb.firebaseapp.com",
            databaseURL: "https://naubinodb.firebaseio.com",
            projectId: "naubinodb",
            storageBucket: "naubinodb.appspot.com",
            messagingSenderId: "259538942696"
        };
        firebase.initializeApp(config);
        this.db = firebase.firestore()
    }

    async fetch_top10() {
        return this.db
            .collection("naubino42-highscore")
            .orderBy("score", "desc")
            .limit(10)
            .get()
    }
}

async function test_naubino_db() {
    const db = new NaubinoDb()
    const top10 = await db.fetch_top10()
    top10.forEach((entry) => {
        console.info("* top10", entry.data());
    })
    const top_entry = top10.docs[0]
    try {
        const { displayname } = top_entry.data()
        const score = Math.round(90 + 20 * Math.random())
        console.info("* update", { displayname, score })
        await top_entry.ref.update({ score })
    } catch (error) {
        console.error("Couldn't update top 10 entry.")
        throw error
    }
}

test_naubino_db()


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