import { assert } from "chai"
import { Naubino, Naub } from "./naubino"

let naubino: Naubino
naubino = new Naubino()
naubino.size = { x: 200, y: 200 }

const test_cycle = naubino.create_naub_chain(3);
const reachable_a = test_cycle[0].reachable_naubs()
assert.equal(reachable_a.length, 3, "not all naubs reachable")

test_cycle[0].join_naub(test_cycle[test_cycle.length - 1])
const reachable_b = test_cycle[0].reachable_naubs()
assert.deepEqual(reachable_a, reachable_b, "reachable_naubs after join_naub differs")

const cycles = test_cycle[0].find_cycles()
assert.isNotEmpty(cycles, "no cycles found")

console.log(test_cycle.length, cycles[0].length, cycles[0])
assert.deepEqual(new Set(test_cycle), new Set(cycles[0]), "cycle didn't detect everyone")