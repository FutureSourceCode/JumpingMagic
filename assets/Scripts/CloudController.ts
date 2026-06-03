import { _decorator, Component, Node, Vec3, CCInteger, AudioSource, AudioClip, Collider2D, Contact2DType, PhysicsSystem2D, EPhysics2DDrawFlags } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('CloudController')
export class CloudController extends Component {

    private _isFalling: boolean = false;
    public blockIndex: number = 0;
    public gameManager!: GameManager;
    public _isLanded: boolean = false;

    public fallSpeed: number = 0;//下落速度
    public blockY: number = 0;//落到地上位置


    get isFalling(): boolean {
        return this._isFalling;
    }

    start() {
        // 获取当前节点上的碰撞器组件
        const collider = this.getComponent(Collider2D);

        if (collider) {
            // 1. 注册“开始接触”事件
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
        const initPos = this.node.position;
        this.node.setPosition(initPos.x, 500, initPos.z);
    }

    //碰撞回调
    private isCollision: boolean = false;
    onBeginContact() {
        this.isCollision = true;
    }

    onDestroy() {
        // 销毁时记得取消监听，防止报错
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    get_isFalling() {
        return this._isFalling;
    }

    set_isFalling(isFalling: boolean) {
        this._isFalling = isFalling;
    }

    startFall() {
        if (this._isLanded) return;
        this._isFalling = true;
    }

    stopFall() {
        this._isFalling = false;
    }

    getFallSpeed() {
        return this.fallSpeed;
    }

    setFallSpeed(speed: number) {
        this.fallSpeed = speed;
    }


    update(deltaTime: number) {
        // 小于-12768销毁
        if (this.node.position.x < -12768) {
            this.node.destroy();
            this.gameManager._activeClouds.delete(this.blockIndex);
            return;
        }

        if (!this._isFalling || this._isLanded) return;

        const curPos = this.node.position;
        const newY = curPos.y - this.fallSpeed * deltaTime;

        if (this.isCollision) {
            const playerIndex = this.gameManager.getCurPlayerIndex();
            if (playerIndex === this.blockIndex) {
                // 记录砸死玩家的云块索引
                this.gameManager.setKillCloudIndex(this.blockIndex);
                this.gameManager.triggerGameOver();
                this.stopFall(); // 砸死玩家时暂停下落
                return;
            }
        }

        // 落到草块高度停止
        if (newY <= this.blockY) {
            this.node.setPosition(curPos.x, this.blockY, curPos.z);
            this._isFalling = false;
            this._isLanded = true;
            return;
        }

        this.node.setPosition(curPos.x, newY, curPos.z);
    }
}