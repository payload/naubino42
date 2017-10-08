import * as Matter from "matter-js"
import { Vector } from "matter-js"

declare module "matter-js" {
    interface Constraint {
        userData?: any
    }
}

export { Matter, Vector }