import { Naubino, Naub, NaubJoint } from "./naubino"
import { Vector } from "./matter-js"
import * as _ from "lodash"


export class NaubFactory {

    naubino: Naubino

    constructor(naubino: Naubino) {
        this.naubino = naubino
    }

    create_naub(pos?: Vector) {
        let naub = new Naub(this.naubino.engine)
        if (pos) naub.pos = Vector.clone(pos)
        this.naubino.add_naub(naub)
        return naub
    }

    create_naub_chain(n: number, chain_center: Vector = { x: 0, y: 0 }, rot: number = 0): Naub[] {
        let naubs = _.times(n, () => { return this.create_naub() })

        // distance between each naub pair
        let rest_lens = []
        for (let i = 0; i < naubs.length - 1; ++i) {
            const rest_len = NaubJoint.targetLength(naubs[i], naubs[i + 1])
            rest_lens.push(rest_len)
        }

        // running sum of distances from 0 to total
        let len_sums = [0]
        for (let i = 0; i < rest_lens.length; ++i) {
            len_sums.push(len_sums[i] + rest_lens[i])
        }
        let total_len = len_sums[len_sums.length - 1]

        // positions along direction with naub pair distances
        let direction = Vector.rotate({ x: 1, y: 0 }, rot)
        let positions = _.map(len_sums, (len_sum) => {
            return Vector.mult(direction, -0.5 * total_len + len_sum)
        })

        // apply position together with chain_center to naubs
        _.forEach(naubs, (naub, i) => {
            naub.pos = Vector.add(chain_center, positions[i])
        })

        // join naubs
        for (let i = 0; i < naubs.length - 1; ++i) {
            this.naubino.add_naub_joint(naubs[i].join_naub(naubs[i + 1]))
        }

        return naubs
    }
}
