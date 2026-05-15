import { _decorator, Component, Node, Vec3, CCInteger, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CloudController')
export class CloudController extends Component {
    @property({ type: CCInteger })
    public fallSpeed: number = 50;
    @property({ type: CCInteger })
    public fallDeadY: number = -100;

    private _isFalling: boolean = false;
    public blockIndex: number = 0;

    start() {
        const initPos = this.node.position;
        this.node.setPosition(initPos.x, 500, initPos.z);
    }

    startFall() {
        this._isFalling = true;
    }

    stopFall() {
        this._isFalling = false;
    }

    update(deltaTime: number) {
        if (!this._isFalling) return;

        const curPos = this.node.position;
        const newY = curPos.y - this.fallSpeed * deltaTime;
        this.node.setPosition(curPos.x, newY, curPos.z);

        if (newY <= this.fallDeadY) {
            this.node.emit('CloudFallDead', this.blockIndex);
            this._isFalling = false;
        }
    }
}