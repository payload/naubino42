type Pos = [number, number]
type Color = number
type NaubId = number
type PointerId = number

type StepFunc<T> = (state: T) => T
type StepNaubSystem = StepFunc<NaubSystem>

type NaubSystem = {
    naubs: Naub[],
    naub_joints: NaubJoint[],
    pointers: Pointer[],
}

type Naub = {
    id: NaubId,
    pos: Pos,
    col: Color,
}

type NaubJoint = {
    naub_a: NaubId,
    naub_b: NaubId,
}

type Pointer = {
    id: PointerId,
    naub: NaubId,
    pos: Pos,
}

type NaubinoArenaMode = {
    naubSystem: NaubSystem,
    
    game_width: number,
    game_height: number,
    game_over: boolean,
    arena_radius: number,
    arena_max_naubs: number,

    center_joints: CenterJoint[],
}

type CenterJoint = {
    naub: NaubId,
}