import { Naubino, Naub, Update, Pointer } from "./naubino"
import { ArenaMode } from "./arena-mode"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"

require("pepjs")

const palette = new Map<string, number[]>([
    ["red", [229, 53, 23]],
    ["pink", [226, 0, 122]],
    ["green", [151, 190, 13]],
    ["blue", [0, 139, 208]],
    ["purple", [100, 31, 128]],
    ["yellow", [255, 204, 0]]])



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



addEventListener("click", function () {
    var el: any = document.documentElement,
        rfs = el.requestFullscreen
            || el.webkitRequestFullScreen
            || el.mozRequestFullScreen
            || el.msRequestFullscreen
        ;
    rfs.call(el);
});



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
const pointerNaubinoMap = new Map<number, Pointer>()

function pointer_naubino_touch_down(ev: PointerEvent, pos: Vector) {
    const naubino = (<any>window).Game.naubino
    if (naubino.game_over) return
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




export class Game {
    private naubino = new Naubino()
    private gameMode = new ArenaMode(this.naubino)
    private playing = false

    private render_score_config = {
        x: 60,
        y: 60,
        r: 1,
        l: -25,
        t: -25,
        w: 50,
        h: 50,
        tx: -8,
        ty: 11,
        font: "30px bold Comfortaa,sans-serif"
    }

    constructor() {
        this.naubino.size = { x: 600, y: 400 }
    }

    start() {
        this.playing = true;
        this.main_loop();
    }

    pause() {
        this.playing = false;
    }

    main_loop() {
        if (this.playing) {
            this.gameMode.step()
            const update = this.naubino.step()
            this.main_loop_render(update)
            window.requestAnimationFrame(() => this.main_loop())
        }
    }

    resize() {
        console.log('resize', window.innerWidth, window.innerHeight)
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        this.naubino.size.x = canvas.width
        this.naubino.size.y = canvas.height
        this.gameMode.set_center_pos()
    }




    canvas_init() {
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
            if (ev.key == " ") this.gameMode.spam_naub_pair()
        })
        window.addEventListener("keypress", (ev) => {
            if (ev.key == "s") this.gameMode.doSpam = !this.gameMode.doSpam
        })
    }



    main_loop_render(update: Update) {
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
        this.render_arena(ctx, this.gameMode)
        ctx.restore()

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
            const color = this.get_color(naub.color)
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(naub.pos.x, naub.pos.y, naub.radius, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
        }
        ctx.restore()

        const world = this.naubino.engine.world

        ctx.save()
        //this.render_matter(ctx)
        ctx.restore()

        ctx.save()
        //render_pointer_history(ctx)
        ctx.restore()

        ctx.save()
        this.render_debug_matter_query(ctx)
        ctx.restore()

        ctx.save()
        this.render_score(ctx, update)
        ctx.restore()

        ctx.save()
        if (update.game_over) {
            this.render_game_over(ctx, update)
        }
        ctx.restore()

        ctx.restore()
    }

    get_color(name: string): string {
        return "rgb(" + palette.get(name).join(",") + ")"
    }

    render_game_over(ctx: CanvasRenderingContext2D, update: Update) {
        const text1 = `game over`
        const text2 = `popped ${Math.floor(update.score)} naubs`
        const text3 = "hit ENTER to restart game"

        ctx.fillStyle = "black"
        ctx.textAlign = "center"
        ctx.font = "48px bold Comfortaa,sans-serif"
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 10
        ctx.strokeText(text1, 0, -48)
        ctx.fillText(text1, 0, -48)
        ctx.strokeText(text2, 0, 48)
        ctx.fillText(text2, 0, 48)

        ctx.lineWidth = 5
        ctx.font = "16px bold Comfortaa,sans-serif"
        ctx.strokeText(text3, 0, 96)
        ctx.fillText(text3, 0, 96)
    }

    render_arena(ctx: CanvasRenderingContext2D, mode: ArenaMode) {
        const { x, y, radius } = mode.arena
        ctx.strokeStyle = "#cecece"
        ctx.lineWidth = 3
        ctx.moveTo(x + radius, y)
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()
    }

    render_score(ctx: CanvasRenderingContext2D, update: Update) {
        const text = `${Math.floor(update.score)}`
        const { x, y, r, l, t, w, h, tx, ty, font } = this.render_score_config

        ctx.fillStyle = this.get_color("yellow")
        ctx.translate(x, y)

        ctx.save()
        ctx.rotate(r)
        ctx.fillRect(l, t, w, h)
        ctx.restore()

        ctx.fillStyle = "black"
        ctx.font = font
        ctx.fillText(text, tx, ty)
    }

    render_debug_matter_query(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        for (const query of this.naubino.debug_matter_queries) {
            ctx.beginPath()
            ctx.moveTo((<any>query)[0].x, (<any>query)[0].y)
            for (const p of (<Array<Vector>>query).slice(1)) {
                ctx.lineTo(p.x, p.y)
            }
            ctx.closePath()
            ctx.fill()
        }
        this.naubino.debug_matter_queries = []
    }

    render_matter(ctx: CanvasRenderingContext2D) {
        const world = this.naubino.engine.world
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
}

let canvas: HTMLCanvasElement

const GAME = new Game();
(<any>window)['Game'] = GAME;

window.addEventListener("load", () => {
    GAME.canvas_init();
    GAME.start();

    GAME.resize()

    setInterval(show_next_log_msg, 1000)
})

window.addEventListener('resize', (ev) => {
    console.log('window resize')
    GAME.resize()
})

