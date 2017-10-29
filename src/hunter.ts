import { Naubino, Naub, Pointer } from "./naubino"
import { Vector } from "./matter-js"
import * as _ from "lodash"

export class Hunter {
    _naubino: Naubino
    _naub_a: Naub
    _naub_b: Naub
    _touch: Pointer
    _force = _.random(8, 12)
    finished = false

    constructor(naubino: Naubino, naub_a: Naub, naub_b: Naub) {
        this._naubino = naubino
        this._naub_a = naub_a
        this._naub_b = naub_b
        this._touch = naubino.touch_down(naub_a.pos)
        console.assert(this._naubino)
        console.assert(this._naub_a)
        console.assert(this._naub_b)
        console.assert(this._touch)
    }

    step() {
        // TODO this.finished could be a cb or promise
        const { _touch, _naub_a, _naub_b } = this
        if (this.finished) {
            return // already finished
        }
        if (!_touch) {
            this.finished = true
            return // no touch
        }
        if (!_naub_a.alive) {
            _touch.up()
            this._naubino.remove_pointer(_touch)
            this.finished = true
            return // naub_a not alive
        }
        if (!_naub_a.merges_with(_naub_b)) {
            _touch.up()
            this._naubino.remove_pointer(_touch)
            this.finished = true
            return // naub_a doesn't merge with naub_b
        }
        const a = _naub_a.pos
        const b = _naub_b.pos
        const diff = Vector.sub(b, a)
        if (Vector.magnitudeSquared(diff) > 1) {
            const direction = Vector.normalise(diff)
            const forward = Vector.mult(direction, this._force)
            _touch.move(forward)
        } else {
            _touch.move(diff)
        }
    }
}
