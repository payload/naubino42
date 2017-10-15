import { Naubino, Naub, Hunter, Update, ArenaMode, Pointer } from "./naubino"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"

require("pepjs")

let naubino: Naubino
let mode: ArenaMode
let canvas: HTMLCanvasElement

window.addEventListener("load", () => {
    canvas_init()
    naubino_init()
    naubino_start()
    window.setTimeout(() => {
        main_loop()
    }, 1000)
    resize()

    setInterval(show_next_log_msg, 1000)
})

window.addEventListener('resize', (ev) => {
    console.log('window resize')
    resize()
})



let _log = new Array<Array<any>>()
function show_next_log_msg() {
    _log.shift()
}
const _console_log = console.log
console.log = (...args: any[]) => {
    _console_log(...args)
    _log.push(["log"].concat(args))
}
const _console_error = console.error
console.error = (...args: any[]) => {
    _console_error(...args)
    _log.push(["error"].concat(args))
}



addEventListener("click", function() {
    var el: any = document.documentElement,
      rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen 
    ;
    rfs.call(el);
});



function resize() {
    console.log('resize', window.innerWidth, window.innerHeight)
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    naubino.size.x = canvas.width
    naubino.size.y = canvas.height
    mode.set_center_pos()
}



function pointer_down(ev: PointerEvent) {
    canvas.setPointerCapture(ev.pointerId)
    const pos = pointer_ev_pos(ev)
    pointer_naubino_touch_down(ev, pos)
    pointer_down_history(ev, pos)
    ev.preventDefault()
}
function pointer_move(ev: PointerEvent) {
    const pos = pointer_ev_pos(ev)
    pointer_naubino_moveTo(ev, pos)
    pointer_move_history(ev, pos)
    ev.preventDefault()
}
function pointer_up(ev: PointerEvent) {
    console.log("up", ev.type, ev.which)
    pointer_naubino_up(ev)
    pointer_up_history(ev)
    ev.preventDefault()
}
function pointer_ev_pos(ev: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: -rect.left + ev.x,
        y: -rect.top + ev.y,
    }
}



const pointerHistoryColors = "red green blue yellow pink purple".split(" ")
const pointerHistoryMap = new Map<number, Vector[]>()
function pointer_down_history(ev: PointerEvent, pos: Vector) {
    pointerHistoryMap.set(ev.pointerId, [pos])
}
function pointer_move_history(ev: PointerEvent, pos: Vector) {
    const history = pointerHistoryMap.get(ev.pointerId)
    if (history) history.push(pos)
}
function pointer_up_history(ev: PointerEvent) {
    setTimeout(() => pointerHistoryMap.delete(ev.pointerId), 3000)
}
function render_pointer_history(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 2
    for (const [id, history] of pointerHistoryMap.entries()) {
        ctx.beginPath()
        ctx.strokeStyle = pointerHistoryColors[id % pointerHistoryColors.length]
        ctx.moveTo(history[0].x, history[0].y)
        for (const xy of history.slice(1)) {
            ctx.lineTo(xy.x, xy.y)
        }
        ctx.stroke()
        ctx.closePath()
    }
}



const pointerNaubinoMap = new Map<number, Pointer>()
function pointer_naubino_touch_down(ev: PointerEvent, pos: Vector) {
    const pointer = naubino.touch_down(pos)
    if (pointer) {
        pointerNaubinoMap.set(ev.pointerId, pointer)
    }
}
function pointer_naubino_moveTo(ev: PointerEvent, pos: Vector) {
    const pointer = pointerNaubinoMap.get(ev.pointerId)
    if (pointer) {
        pointer.moveTo(pos)
    }
}
function pointer_naubino_up(ev: PointerEvent) {
    const pointer = pointerNaubinoMap.get(ev.pointerId)
    if (pointer) {
        pointer.up()
        pointerNaubinoMap.delete(ev.pointerId)
    }
}



function canvas_init() {
    canvas = <HTMLCanvasElement>document.querySelector("#naubino42")
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "black"
    ctx.fillText("naubino", canvas.width / 2, canvas.height / 2)

    canvas.addEventListener("pointerdown", pointer_down, false)
    canvas.addEventListener("pointermove", pointer_move, false)
    canvas.addEventListener("pointerup", pointer_up, false)
    canvas.addEventListener("pointercancel", pointer_up, false)
    canvas.addEventListener("pointerleave", pointer_up, false)

    window.addEventListener("keypress", (ev) => {
        if (ev.key == " ") mode.spam_naub_pair()
    })
    window.addEventListener("keypress", (ev) => {
        if (ev.key == "s") mode.spammer = !mode.spammer
    })
}

function naubino_init() {
    naubino = new Naubino()
    naubino.size = { x: 600, y: 400 }
    mode = new ArenaMode(naubino)
}

function naubino_start() {

}

function main_loop() {
    mode.step()
    const update = naubino.step()
    main_loop_render(update)
    window.requestAnimationFrame(() => {
        main_loop()
    })
}

const palette = new Map<string, number[]>([
    ["red", [229, 53, 23]],
    ["pink", [226, 0, 122]],
    ["green", [151, 190, 13]],
    ["blue", [0, 139, 208]],
    ["purple", [100, 31, 128]],
    ["yellow", [255, 204, 0]]])


interface NState {
    x: number
    y: number
    radius: number
    color: string
    alpha: number
}
class NAnimState {
    a: NState
    b: NState
    time: number
    duration: number
}
class NAnim extends NAnimState {
    constructor(state: NAnimState) {
        super()
        this.a = state.a
        this.b = state.b
        this.time = state.time
        this.duration = state.duration
    }
    interpolate(): NState {
        const { a, b, time, duration } = this
        const f = time / duration
        const interp = (field: 'x' | 'y' | 'radius' | 'alpha') => a[field] + (b[field] - a[field]) * f
        return {
            x: interp('x'),
            y: interp('y'),
            radius: interp('radius'),
            color: b.color,
            alpha: interp('alpha')
        }
    }
}
let naub_anims = new Set<NAnim>()

function main_loop_render(update: Update) {
    const ctx = canvas.getContext("2d")
    ctx.save()
    //ctx.fillStyle = "#303030"
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (_log[0]) {
        ctx.fillStyle = "black"
        const msg = _log[0].join(" ")
        ctx.fillText(msg, 1, 14)
    }

    ctx.save()
    ctx.strokeStyle = "black"
    for (const joint of update.naub_joints) {
        const { x: xa, y: ya } = joint.naub_a.pos
        const { x: xb, y: yb } = joint.naub_b.pos
        ctx.lineWidth = joint.naub_a.radius * 0.212 * 2
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.lineTo(xb, yb)
        ctx.closePath()
        ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    for (const naub of update.naubs) {
        const color = "rgb(" + palette.get(naub.color).join(",") + ")"
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(naub.pos.x, naub.pos.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }
    ctx.restore()

    for (const naub of update.removed_naubs) {
        const duration = 1
        naub_anims.add(new NAnim({
            a: {
                x: naub.pos.x,
                y: naub.pos.y,
                radius: naub.radius,
                color: naub.color,
                alpha: 1
            },
            b: {
                x: naub.pos.x + naub.body.velocity.x * duration,
                y: naub.pos.y + naub.body.velocity.y * duration,
                radius: 0,
                color: naub.color,
                alpha: 0
            },
            time: 0,
            duration: duration
        }))
    }
    ctx.save()
    for (const anim of naub_anims) {
        anim.time = Math.min(anim.time + 0.016666, anim.duration)
        const naub = anim.interpolate()
        const color = "rgba(" + palette.get(naub.color).join(",") + "," + naub.alpha + ")"
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(naub.x, naub.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }
    for (const anim of naub_anims) {
        if (anim.time == anim.duration) {
            naub_anims.delete(anim)
        }
    }

    const world = naubino.engine.world

    ctx.save()
    //render_matter()
    ctx.restore()

    ctx.save()
    //render_pointer_history(ctx)
    ctx.restore()

    ctx.restore()
}

function render_matter(ctx: CanvasRenderingContext2D) {
    const world = naubino.engine.world
    for (const constraint of world.constraints) {
        const { pointA, pointB, bodyA, bodyB, userData } = constraint
        const xa = pointA.x + (bodyA ? bodyA.position.x : 0)
        const ya = pointA.y + (bodyA ? bodyA.position.y : 0)
        const xb = pointB.x + (bodyB ? bodyB.position.x : 0)
        const yb = pointB.y + (bodyB ? bodyB.position.y : 0)

        ctx.save()
        if (userData) {
            switch (userData.type) {
                case "ArenaMode.CenterJoint":
                    ctx.setLineDash([1, 5])
                    ctx.strokeStyle = "lightgray"
                    ctx.lineWidth = 1
                    break
                case "NaubJoint":
                    ctx.strokeStyle = "gray"
                    ctx.lineWidth = 1
                    break
                default:
                    ctx.strokeStyle = "red"
                    ctx.lineWidth = 2
            }
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 2
        }
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.lineTo(xb, yb)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
    }
}