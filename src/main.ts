import { assert } from "chai"
import { Naubino, Naub } from "./naubino"

let naubino: Naubino
naubino = new Naubino()
naubino.size = { x: 200, y: 200 }

const test_cycle = naubino.create_naub_chain(5);
const reachable_a = test_cycle[0].reachable_naubs()
assert.equal(reachable_a.length, test_cycle.length, "not all naubs reachable")

const reachable_b = test_cycle[0].reachable_naubs()
assert.deepEqual(reachable_a, reachable_b, "reachable_naubs after join_naub differs")

const cycles = test_cycle[2].find_cycles()
assert.isEmpty(cycles, "cycles found")