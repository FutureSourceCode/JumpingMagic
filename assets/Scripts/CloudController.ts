import { _decorator, Component, Node, Vec3, CCInteger, AudioSource, AudioClip } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('CloudController')
export class CloudController extends Component {
    @property({ type: AudioClip })
    public hitPlayerClip: AudioClip = null!;
    private _audioSource: AudioSource = null!;

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
        const initPos = this.node.position;
        this.node.setPosition(initPos.x, 500, initPos.z);
        this._audioSource = this.node.getComponent(AudioSource);
        if (!this._audioSource) {
            this._audioSource = this.node.addComponent(AudioSource);
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

    playHitPlayerSound() {
        if (this.hitPlayerClip && this._audioSource) {
            this._audioSource.playOneShot(this.hitPlayerClip);
        }
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

        // 下落高度小于172 + 同格子 = 砸死
        if (newY < 172) {
            const playerIndex = this.gameManager.getCurPlayerIndex();
            if (playerIndex === this.blockIndex) {
                // 记录砸死玩家的云块索引
                this.gameManager.setKillCloudIndex(this.blockIndex);
                this.playHitPlayerSound();
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