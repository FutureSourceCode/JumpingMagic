import { _decorator, Component, Vec3, Animation, AudioSource, director, Director } from 'cc';
const { ccclass, property } = _decorator;

export const BLOCK_SIZE = 80;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Animation)
    BodyAnim: Animation = null;

    private _startJump: boolean = false;
    private _jumpStep: number = 0;
    private _curJumpTime: number = 0;
    private _jumpTime: number = 0.1;
    private _curJumpSpeed: number = 0;
    private _curPos: Vec3 = new Vec3();
    private _deltaPos: Vec3 = new Vec3(0, 0, 0);
    private _targetPos: Vec3 = new Vec3();
    private _curMoveIndex: number = 0;

    start() {
        //input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    setInputActive(active: boolean) {
        const audio = this.node.parent.children[1].getComponent(AudioSource);
        if (active) {
            audio.play();
            this.node.parent.children[2].active = true;
            this.node.parent.children[3].active = true;
        } else {
            audio.stop();
            this.node.parent.children[2].active = false;
            this.node.parent.children[3].active = false;
        }
    }

    reset() {
        this._curMoveIndex = 0;
        this.node.getPosition(this._curPos);
        this._targetPos.set(0, 0, 0);
    }

    getCurMoveIndex(): number {
        return this._curMoveIndex;
    }
    setCurMoveIndex(step: number) {
        this._curMoveIndex = step;
    }

    oneStep() {
        this.jumpByStep(1);
    }

    twoStep() {
        this.jumpByStep(2);
    }

    jumpByStep(step: number) {
        if (this._startJump) {
            return;
        }
        this._startJump = true;
        this._jumpStep = step;
        this._curJumpTime = 0;

        const clipName = step == 1 ? 'oneStep' : 'twoStep';
        const state = this.BodyAnim.getState(clipName);
        this._jumpTime = state.duration;

        this._curJumpSpeed = this._jumpStep * BLOCK_SIZE / this._jumpTime;
        this.node.getPosition(this._curPos);
        Vec3.add(this._targetPos, this._curPos, new Vec3(this._jumpStep * BLOCK_SIZE, 0, 0));

        if (this.BodyAnim) {
            if (step === 1) {
                this.BodyAnim.play('oneStep');
            } else if (step === 2) {
                this.BodyAnim.play('twoStep');
            }
        }

        // 计算目标格子索引并发送跳跃开始事件
        const targetIndex = this._curMoveIndex + step;
        this.node.emit('JumpStart', targetIndex);

        this._curMoveIndex += step;
    }

    // 强制移动到指定格子（复活用）
    forceMoveToIndex(index: number) {
        this._curMoveIndex = index;
        const targetX = index * BLOCK_SIZE;
        this.node.setPosition(targetX, this.node.position.y, this.node.position.z);
    }

    onOnceJumpEnd() {
        this.node.emit('JumpEnd', this._curMoveIndex);
    }

    update(deltaTime: number) {
        if (this._startJump) {
            this._curJumpTime += deltaTime;
            if (this._curJumpTime > this._jumpTime) {
                // end
                this.node.setPosition(this._targetPos);
                this._startJump = false;
                this.onOnceJumpEnd();
            } else {
                // tween
                this.node.getPosition(this._curPos);
                this._deltaPos.x = this._curJumpSpeed * deltaTime;
                Vec3.add(this._curPos, this._curPos, this._deltaPos);
                this.node.setPosition(this._curPos);
            }
        }
    }
}