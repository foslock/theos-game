import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT, WALK_SPEED } from '../config';
import {
  getRoom,
  type Exit,
  type Hitbox,
  type Hotspot,
  type Room,
  type PickupHotspot,
  type ContainerHotspot,
  type DecorationHotspot,
  type MinigameHotspot,
  type Rect,
  type Pt,
} from '../data/rooms';
import { exitOpen, findExit } from '../data/graph';
import { ITEMS, type ItemId } from '../data/items';
import {
  addItem,
  carriedCount,
  FLAGS,
  getFlag,
  isPickedUp,
  isUnlocked,
  itemCount,
  markPickedUp,
  markUnlocked,
  removeItem,
  setFlag,
  type GameState,
} from '../state/GameState';
import { store } from '../state/Store';
import { evaluate, requiredItem } from '../systems/Conditions';
import { Character } from '../systems/Walker';
import { Dialogue } from '../systems/Dialogue';
import { AmbientBackground } from '../systems/Ambient';
import { Ambience } from '../systems/Ambience';
import { HintTimer, hintLine, lucyHintLine } from '../systems/Hints';
import { DitherFade } from '../systems/DitherFade';
import { buildWalkMap, findPath, type WalkMap } from '../systems/Pathfind';
import { arrowCursor, setCursor, type CursorKind } from '../systems/Cursor';
import { pick } from '../systems/Hitbox';
import { playSfx, unlockAudio } from '../systems/Sfx';
import { playMusic } from '../systems/Music';
import { pointerVerb } from '../ui/text';
import { BreakfastController } from '../puzzles/BreakfastController';
import { BasketballController } from '../puzzles/BasketballController';
import { StompRocketController } from '../puzzles/StompRocketController';
import { BALLS_NEEDED } from '../puzzles/basketball';

const LUCY_FOLLOW_GAP = 56;
const LUCY_FOLLOW_DY = 6;
const LUCY_FOLLOW_DELAY_MS = 150;
const LUCY_RUN_SPEED = WALK_SPEED * 1.7;
/** Feet height Lucy enters the kitchen at: below the doorway's threshold so she is not hugging its frame. */
const KITCHEN_DOORWAY_Y = 336;
/**
 * Screen x of the doorway's far jamb. Everything right of here — that jamb and the wall beyond —
 * is redrawn over Lucy so she is hidden until she reaches the opening. The near jamb at 580-598
 * is deliberately left alone: she walks out in front of it.
 */
const DOORWAY_FAR_JAMB = 619;
/** Gap between one hint sparkle starting and the next (each twinkle lasts 1.2s). */
const GLINT_STAGGER_MS = 1400;
/** How long Theo's greeting stays up before he climbs out of bed on his own. */
const WAKE_GREETING_MS = 2800;
/**
 * The bedroom art has no bed in it, so the bed is always an overlay drawn here. All three poses
 * share one silhouette, which is what lets them swap without the frame appearing to move.
 */
const BED_POS = { x: 124, y: 196 };
/** The bed's base, so feet in front of it sort ahead of it and feet up by the wall sort behind. */
const BED_DEPTH = 328;
/** Where Theo lands after hopping out, clear of the bed's footprint. */
const WAKE_STAND = { x: 300, y: 344 };

/** Which of a decoration's lines comes next, per room and hotspot, kept for the whole session. */
const lineCursor = new Map<string, number>();

/** Something clickable in the room: a footprint plus what it does. */
interface Target extends Hitbox {
  id: string;
  cursor: () => CursorKind;
  press: () => void;
}

/** A mini-game that has taken over the pointer: it gets every press and release in the scene area. */
export interface PointerCapture {
  down: (p: Phaser.Input.Pointer) => void;
  up: (p: Phaser.Input.Pointer) => void;
}

interface GameData {
  /** New game: Theo wakes up in bed. */
  wakeUp?: boolean;
  /** Back from the slide ride: the party is already in the playground, no walking in. */
  afterSlide?: boolean;
}

/** Renders whichever room the store says we are in, and runs all point-and-click interaction. */
export class GameScene extends Phaser.Scene {
  theo!: Character;
  lucy: Character | null = null;
  dialogue!: Dialogue;

  private room!: Room;
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private ambient?: AmbientBackground;
  private ambience?: Ambience;
  /** The bedroom's bed overlay, swapped between poses during the wake-up intro. */
  private bed?: Phaser.GameObjects.Image;
  private hints!: HintTimer;
  private walkMap!: WalkMap;
  private fade!: DitherFade;
  private breakfast!: BreakfastController;
  private basketball!: BasketballController;
  private rocket!: StompRocketController;
  /** Set while a mini-game owns the pointer; room targets are ignored meanwhile. */
  private capture: PointerCapture | null = null;
  private captureCursor: CursorKind = 'ball';
  private pickupSprites = new Map<string, Phaser.GameObjects.Image>();
  /** Hidden pickups still to be found, by hotspot id, so hints can glint their hiding place. */
  private hiddenPickups = new Map<string, Rect>();
  /** Sparkles queued by the last hint, so an interaction can cut the sequence short. */
  private glints: { tween: Phaser.Tweens.Tween; image: Phaser.GameObjects.Image }[] = [];
  /** Containers already opened this visit, so the open flash only plays once each. */
  private openedContainers = new Set<string>();
  /** Everything clickable in the room, resolved by nearest footprint rather than Phaser zones. */
  private targets: Target[] = [];
  private _busy = false;
  /** Items carried, watched so that anything new setting Lucy off works wherever it came from. */
  private carried = 0;
  private unwatchInventory?: () => void;
  /** Cursor the pointer would show if nothing were happening (what it is hovering). */
  private hoverKind: CursorKind = 'default';

  /** While busy (walking, talking, changing rooms) clicks are ignored and the cursor is a faded watch. */
  private get busy(): boolean {
    return this._busy;
  }
  private set busy(value: boolean) {
    this._busy = value;
    setCursor(this, value ? 'wait' : this.hoverKind);
  }

  constructor() {
    super('Game');
  }

  create(data: GameData = {}): void {
    this.dialogue = new Dialogue(this);
    this.breakfast = new BreakfastController(this);
    this.basketball = new BasketballController(this);
    this.rocket = new StompRocketController(this);
    this.capture = null;
    this.fade = new DitherFade(this, GAME_WIDTH, SCENE_HEIGHT);
    this.fade.setBlack();
    this.hints = new HintTimer(
      this,
      () => this.showHints(false),
      () => this.showHints(true),
    );
    const s = store.get();
    this.room = getRoom(s.currentRoom);
    const wake = !!data.wakeUp && this.room.id === 'bedroom' && ['theo_front', 'bed_asleep', 'bed_sit'].every((k) => this.textures.exists(k));
    // During the wake-up intro the HUD is shown but keeps its backpack prompt quiet.
    this.registry.set('hudQuiet', wake);
    this.scene.launch('Hud');
    this.buildRoom();

    const entryExit = s.previousRoom && !data.afterSlide ? findExit(this.room.id, s.previousRoom) : undefined;
    const spawn = entryExit?.walkTo ?? this.room.restPoint;
    this.theo = new Character(this, 'theo', spawn.x, spawn.y);
    if (s.lucyJoined) {
      const dir = Math.sign(this.room.restPoint.x - spawn.x) || 1;
      this.lucy = new Character(this, 'lucy', Phaser.Math.Clamp(spawn.x - dir * LUCY_FOLLOW_GAP, 16, 624), spawn.y + LUCY_FOLLOW_DY);
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockAudio();
      if (this.capture) {
        if (p.y <= SCENE_HEIGHT) this.capture.down(p);
        return;
      }
      this.targetAt(p)?.press();
    });
    for (const evt of ['pointerup', 'pointerupoutside']) this.input.on(evt, (p: Phaser.Input.Pointer) => this.capture?.up(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    // Lucy cheers whatever Theo pockets, whether he picked it off the floor or found it in a drawer.
    this.carried = carriedCount(s);
    this.unwatchInventory = store.subscribe((next) => {
      const now = carriedCount(next);
      if (now > this.carried) this.lucy?.celebrate();
      this.carried = now;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    if (wake) {
      void this.wakeUp();
    } else if (data.afterSlide) {
      void this.fade.in(FADE_MS);
      void this.backFromSlide();
    } else {
      void this.fade.in(FADE_MS);
      void this.enterRoom(!!entryExit);
    }
  }

  /** The party is back at the bottom of the slide; a word about the ride, then the room is theirs. */
  private async backFromSlide(): Promise<void> {
    this.busy = true;
    this.placeParty(this.room.restPoint);
    await this.sayLucy('Again! Again!');
    await this.sayTheo('What a day! Mom and Dad will be home soon.');
    this.busy = false;
    this.hints.reset();
  }

  // ---------- New-game intro: Theo wakes up in bed ----------

  /**
   * The room fades in slowly with Theo asleep in bed. He sits up and yawns, pauses long enough
   * for his greeting to be read, then hops out and walks to his usual spot. Runs start to finish
   * without input.
   */
  private async wakeUp(): Promise<void> {
    this.busy = true;
    this.theo.sprite.setVisible(false);
    this.setBed('bed_asleep');

    void this.fade.in(2600);
    await this.wait(3400);
    playSfx('ding');
    this.setBed('bed_sit');
    await this.dialogue.say('*yaaawn* Good morning!', 245, 212, { duration: WAKE_GREETING_MS, voice: 'theo' });
    // Out from under the covers and down onto the carpet, then hand over to the walking sprite.
    this.setBed('bed_empty');
    const stander = this.add.image(276, 322, 'theo_front').setOrigin(0.5, 1).setDepth(BED_DEPTH + 12);
    this.roomObjects.push(stander);
    await this.tween(stander, { x: WAKE_STAND.x, y: 332 }, 200, 'Quad.easeOut');
    await this.tween(stander, { y: WAKE_STAND.y }, 200, 'Quad.easeIn');
    stander.destroy();
    this.roomObjects = this.roomObjects.filter((o) => o !== stander);
    this.theo.setPosition(WAKE_STAND.x, WAKE_STAND.y);
    this.theo.sprite.setVisible(true);
    playSfx('step');
    this.registry.set('hudQuiet', false);
    this.busy = false;
    await this.enterRoom(true);
  }

  update(_time: number, deltaMs: number): void {
    this.ambience?.update(Math.min(deltaMs / 1000, 0.1));
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tween(target: Phaser.GameObjects.GameObject, props: Record<string, number>, duration: number, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() }));
  }

  // ---------- Room lifecycle ----------

  private buildRoom(): void {
    playMusic(this.room.id);
    this.walkMap = buildWalkMap(this.room);
    this.ambient = new AmbientBackground(this, this.room);
    this.ambience = new Ambience(this, this.room.ambient ?? []);
    const state = store.get();

    if (this.room.id === 'bedroom') this.setBed('bed_empty');
    for (const prop of this.room.props ?? []) {
      if (!this.textures.exists(prop.key)) continue;
      this.roomObjects.push(this.add.image(prop.at.x, prop.at.y, prop.key).setOrigin(0.5, 1).setDepth(prop.at.y));
    }
    for (const exit of this.room.exits) this.addExitZone(exit);
    for (const h of this.room.hotspots) this.addHotspot(h, state);
    if (this.room.id === 'backyard') this.rocket.roomBuilt();
    if (this.room.id === 'kitchen') {
      for (const id of this.breakfast.ensureState().opened) this.showContainerOpen(id);
    }
  }

  /** Shows the bed in one of its poses, creating the overlay on first use. */
  private setBed(texture: 'bed_empty' | 'bed_asleep' | 'bed_sit'): void {
    if (!this.textures.exists(texture)) return;
    if (this.bed) {
      this.bed.setTexture(texture);
      return;
    }
    this.bed = this.add.image(BED_POS.x, BED_POS.y, texture).setOrigin(0).setDepth(BED_DEPTH);
    this.roomObjects.push(this.bed);
  }

  private clearRoom(): void {
    this.targets = [];
    this.dialogue.clear();
    this.ambient?.destroy();
    this.ambient = undefined;
    this.ambience?.destroy();
    this.ambience = undefined;
    this.bed = undefined;
    for (const o of this.roomObjects) o.destroy();
    this.roomObjects = [];
    this.clearGlints();
    this.pickupSprites.clear();
    this.hiddenPickups.clear();
    this.openedContainers.clear();
  }

  private teardown(): void {
    this.basketball.stop();
    this.rocket.stop();
    this.unwatchInventory?.();
    this.unwatchInventory = undefined;
    this.hints.stop();
    this.fade.destroy();
    this.clearRoom();
    this.theo?.destroy();
    this.lucy?.destroy();
    this.lucy = null;
    setCursor(this, 'default');
  }

  private async enterRoom(walkIn: boolean): Promise<void> {
    this.busy = true;
    if (walkIn) await this.moveParty(this.room.restPoint);
    else this.placeParty(this.room.restPoint);

    if (this.room.id === 'kitchen' && !store.get().lucyJoined) {
      store.update((s) => (s.lucyJoined = true));
      const lp = this.room.lucyRestPoint ?? this.room.restPoint;
      // Lucy comes running in through the family room doorway to meet him, appearing in the opening
      // rather than sliding in over the wall beside it.
      const door = { x: this.room.exits.find((e) => e.to === 'family_room')?.walkTo.x ?? GAME_WIDTH - 40, y: KITCHEN_DOORWAY_Y };
      const bg = `${this.room.background}_0`;
      // Runs past the floor line so her feet stay hidden too, not just her body.
      const jamb = this.add.image(0, 0, bg).setOrigin(0).setDepth(900).setCrop(DOORWAY_FAR_JAMB, 50, GAME_WIDTH - DOORWAY_FAR_JAMB, 310);
      this.lucy = new Character(this, 'lucy', GAME_WIDTH + 24, door.y);
      this.lucy.face(-1);
      await this.wait(400);
      await this.lucy.walkPath([door, ...findPath(this.walkMap, door, lp)], true, LUCY_RUN_SPEED);
      jamb.destroy();
      this.lucy.face(this.theo.x - lp.x);
      this.breakfast.ensureState();
      await this.sayLucy("Theo! I'm sooo hungry. Can you make breakfast?");
      await this.sayTheo('Sure, Lucy! I just need to find a bowl, a spoon, cereal and milk.');
    }
    if (this.room.id === 'sport_court') await this.arriveAtCourt();
    this.busy = false;
    this.hints.reset();
  }

  /** Lucy sets the hoop game up the first time, and cheers the balls on whenever they are all here. */
  private async arriveAtCourt(): Promise<void> {
    const state = store.get();
    if (getFlag(state, FLAGS.basketballDone)) return;
    const balls = itemCount(state, 'basketball');
    if (!getFlag(state, FLAGS.basketballHunt)) {
      store.update((s) => setFlag(s, FLAGS.basketballHunt));
      if (balls < BALLS_NEEDED) {
        await this.sayLucy('Basketball time! Um... where are the balls?');
        await this.sayTheo('I think they rolled off somewhere in the house. My room, the family room, the garage...');
        return;
      }
    }
    if (balls >= BALLS_NEEDED) await this.sayLucy(`All three balls! ${pointerVerb()} a hoop and let's play!`);
  }

  /** Theo walks to a point on his own, routed around the furniture. */
  moveTheo(p: Pt): Promise<void> {
    return this.theo.walkPath(findPath(this.walkMap, this.theo, p));
  }

  moveLucy(p: Pt): Promise<void> {
    if (!this.lucy) return Promise.resolve();
    return this.lucy.walkPath(findPath(this.walkMap, this.lucy, p), false);
  }

  /** Registers something a controller drew as part of the room, so it is cleared when the room changes. */
  keepInRoom(obj: Phaser.GameObjects.GameObject): void {
    this.roomObjects.push(obj);
  }

  /**
   * Hands the pointer to a mini-game, or takes it back with null. While captured, nothing in the
   * room is clickable, the idle hints stay quiet, and the cursor is the ball being thrown.
   */
  capturePointer(capture: PointerCapture | null, cursor: CursorKind = 'ball'): void {
    this.capture = capture;
    this.captureCursor = cursor;
    if (capture) this.hints.stop();
    else this.hints.reset();
    this.hoverKind = capture ? cursor : 'default';
    if (!this.busy) setCursor(this, this.hoverKind);
  }

  private placeParty(p: Pt): void {
    this.theo.setPosition(p.x, p.y);
    if (this.lucy) {
      const lp = this.lucyTarget(p);
      this.lucy.setPosition(lp.x, lp.y);
      this.lucy.face(this.theo.x - lp.x);
    }
  }

  /** Where Lucy should stand for a given Theo target: her own rest spot, or just behind him along the walk direction. */
  private lucyTarget(p: Pt, from: Pt = this.theo): Pt {
    if (this.room.lucyRestPoint && p === this.room.restPoint) return this.room.lucyRestPoint;
    const dir = Math.sign(p.x - from.x) || -1;
    const x = Phaser.Math.Clamp(p.x - dir * LUCY_FOLLOW_GAP, 16, 624);
    return { x, y: p.y + LUCY_FOLLOW_DY };
  }

  /** Theo and Lucy walk together; Lucy sets off a beat later so she reads as following him. */
  private async moveParty(p: Pt): Promise<void> {
    const lp = this.lucyTarget(p);
    const lucyWalk = this.lucy
      ? new Promise<void>((resolve) => {
          this.time.delayedCall(LUCY_FOLLOW_DELAY_MS, () => {
            if (!this.lucy) return resolve();
            void this.lucy.walkPath(findPath(this.walkMap, this.lucy, lp), false).then(resolve);
          });
        })
      : Promise.resolve();
    await Promise.all([this.theo.walkPath(findPath(this.walkMap, this.theo, p)), lucyWalk]);
    this.lucy?.face(this.theo.x - this.lucy.x);
  }

  // ---------- Targets ----------

  /**
   * Registers something clickable. Rather than one Phaser zone per hotspot, the scene keeps the
   * footprints itself and resolves a pointer to the single nearest one, which is what lets the
   * shapes hug the art and still forgive a near miss.
   */
  private addTarget(id: string, box: Hitbox, cursor: () => CursorKind, press: () => void): void {
    this.targets.push({ id, zone: box.zone, parts: box.parts, cursor, press });
  }

  private removeTarget(id: string): void {
    this.targets = this.targets.filter((t) => t.id !== id);
    this.hoverKind = 'default';
    if (!this.busy) setCursor(this, 'default');
  }

  /** The target a pointer is over, if any. The HUD runs as its own scene and owns the bar below. */
  private targetAt(p: Phaser.Input.Pointer): Target | undefined {
    if (p.y > SCENE_HEIGHT) return undefined;
    // Lucy goes wherever Theo goes, so she is a target where she stands rather than a fixed zone.
    const lucy = this.lucyTargetAt(p);
    if (lucy) return lucy;
    return pick(this.targets, p.x, p.y);
  }

  private lucyTargetAt(p: Phaser.Input.Pointer): Target | undefined {
    if (!this.lucy) return undefined;
    const b = this.lucy.sprite.getBounds();
    if (!b.contains(p.x, p.y)) return undefined;
    return {
      id: 'lucy',
      zone: { x: b.x, y: b.y, w: b.width, h: b.height },
      cursor: () => 'talk',
      press: () => void this.interact(undefined, () => this.talk('lucy')),
    };
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    this.hoverKind = this.capture ? this.captureCursor : this.targetAt(p)?.cursor() ?? 'default';
    if (!this.busy) setCursor(this, this.hoverKind);
  }

  private addExitZone(exit: Exit): void {
    this.addTarget(`exit:${exit.to}`, exit, () => arrowCursor(exit.direction, !exitOpen(this.room.id, exit, store.get())), () =>
      void this.useExit(exit),
    );
  }

  private addHotspot(h: Hotspot, state: GameState): void {
    switch (h.kind) {
      case 'pickup':
        if (isPickedUp(state, this.room.id, h.id)) return;
        if (h.hiddenUntilFlag && !getFlag(state, h.hiddenUntilFlag)) return;
        this.addPickup(h);
        break;
      case 'backpack':
        if (getFlag(state, FLAGS.hasBackpack)) return;
        this.addBackpack(h);
        break;
      case 'container':
        this.addContainer(h);
        break;
      case 'decoration':
        this.addDecoration(h);
        break;
      case 'talk':
        this.addTarget(h.id, h, () => 'talk', () => void this.interact(h.walkTo, () => this.talk(h.id)));
        break;
      case 'minigame':
        this.addTarget(h.id, h, () => 'play', () => void this.interact(h.walkTo, () => this.startMinigame(h)));
        break;
    }
  }

  private async startMinigame(h: MinigameHotspot): Promise<void> {
    this.hints.reset();
    if (h.game === 'basketball') {
      await this.basketball.hoopClicked();
      return;
    }
    if (h.game === 'rocket') {
      await this.rocket.launcherClicked();
      return;
    }
    await this.sayTheo(getFlag(store.get(), FLAGS.slideDone) ? 'One more time down the slide!' : "Let's go down the slide! Hold on, Lucy!");
    this.hints.stop();
    this.hoverKind = 'default';
    await this.fadeOut();
    this.scene.start('Slide');
  }

  private addPickup(h: PickupHotspot): void {
    if (h.hidden) {
      this.hiddenPickups.set(h.id, h.zone);
    } else if (h.peek) {
      // Drawn where it really is, then the furniture in front is painted back over it.
      const depth = h.zone.y + h.zone.h;
      const img = this.add.image(h.peek.at.x, h.peek.at.y, `item_${h.item}`).setDepth(depth);
      this.ambient?.cover(h.peek.cover, depth + 1);
      this.roomObjects.push(img);
      this.pickupSprites.set(h.id, img);
    } else {
      const img = this.add.image(h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2, `item_${h.item}`).setDepth(h.zone.y + h.zone.h);
      this.roomObjects.push(img);
      this.pickupSprites.set(h.id, img);
    }
    this.addTarget(h.id, h, () => 'grab', () => void this.interact(h.walkTo, () => this.pickUp(h)));
  }

  private addBackpack(h: Extract<Hotspot, { kind: 'backpack' }>): void {
    const img = this.add.image(h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2, 'backpack').setDepth(h.zone.y + h.zone.h);
    this.roomObjects.push(img);
    this.pickupSprites.set(h.id, img);
    this.addTarget(h.id, h, () => 'grab', () =>
      void this.interact(h.walkTo, async () => {
        if (getFlag(store.get(), FLAGS.hasBackpack)) return;
        this.hints.reset();
        img.destroy();
        this.pickupSprites.delete(h.id);
        this.removeTarget(h.id);
        store.update((s) => setFlag(s, FLAGS.hasBackpack));
        playSfx('success');
        await this.sayTheo('My backpack! Now I can carry things with me.');
      }),
    );
  }

  private addContainer(h: ContainerHotspot): void {
    // Something may be tucked inside, so it gets the same grabbing hand as a loose item.
    this.addTarget(h.id, h, () => 'grab', () =>
      void this.interact(h.walkTo, async () => {
        this.hints.reset();
        await this.breakfast.openContainer(h);
      }),
    );
  }

  private addDecoration(h: DecorationHotspot): void {
    this.addTarget(h.id, h, () => 'look', () => {
      if (this.busy) return;
      unlockAudio();
      playSfx(h.sfx ?? 'click');
      if (h.lines?.length) void this.sayTheo(this.nextLine(h));
    });
  }

  /** Theo's remarks about a thing come round in turn, so repeated clicks get some variety. */
  private nextLine(h: DecorationHotspot): string {
    const key = `${this.room.id}:${h.id}`;
    const i = lineCursor.get(key) ?? 0;
    lineCursor.set(key, i + 1);
    return h.lines![i % h.lines!.length];
  }

  // ---------- Interactions ----------

  /** Walks Theo to `walkTo` (if given) then runs `action`, blocking other interactions meanwhile. */
  private async interact(walkTo: Pt | undefined, action: () => Promise<void> | void): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    unlockAudio();
    this.dialogue.clear();
    this.clearGlints();
    try {
      if (walkTo) await this.theo.walkPath(findPath(this.walkMap, this.theo, walkTo));
      await action();
    } finally {
      this.busy = false;
    }
  }

  private async pickUp(h: PickupHotspot): Promise<void> {
    if (isPickedUp(store.get(), this.room.id, h.id)) return;
    if (!evaluate(h.condition, store.get())) {
      playSfx('locked');
      await this.sayTheo(h.refusalComment ?? "I can't take that yet.");
      return;
    }
    this.hints.reset();
    const img = this.pickupSprites.get(h.id);
    if (img) await this.popImage(img);
    else await this.popItem(h.item, h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2);
    store.update((s) => {
      addItem(s, h.item);
      markPickedUp(s, this.room.id, h.id);
    });
    this.pickupSprites.delete(h.id);
    this.hiddenPickups.delete(h.id);
    this.removeTarget(h.id);
    playSfx('pickup');
    await this.sayTheo(h.foundComment ?? `Got the ${ITEMS[h.item].name.toLowerCase()}!`);
  }

  /** Asking Lucy: in the kitchen she runs the breakfast puzzle; anywhere else she hints at what to do next. */
  private async talk(id: string): Promise<void> {
    if (id !== 'lucy' || !this.lucy) return;
    this.lucy.face(this.theo.x - this.lucy.x);
    this.theo.face(this.lucy.x - this.theo.x);
    if (this.room.id === 'kitchen' && !getFlag(store.get(), FLAGS.breakfastDone)) {
      await this.breakfast.talkToLucy();
      return;
    }
    this.hints.reset();
    await this.sayLucy(lucyHintLine(this.room, store.get()));
  }

  /**
   * Spends the key on a door the first time it is opened and remembers the door, so it stays open
   * for the rest of the playthrough and the key stops taking up a backpack slot.
   */
  private async unlockWithKey(exit: Exit): Promise<void> {
    const from = this.room.id;
    if (isUnlocked(store.get(), from, exit.to)) return;
    const key = requiredItem(exit.condition);
    if (!key) return;
    store.update((s) => {
      removeItem(s, key);
      markUnlocked(s, from, exit.to);
    });
    playSfx('open');
    await this.sayTheo(`The ${ITEMS[key].name.toLowerCase()} worked!`);
  }

  private async useExit(exit: Exit): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    unlockAudio();
    this.dialogue.clear();
    try {
      if (!exitOpen(this.room.id, exit, store.get())) {
        // Locked: no walking over, just a glance that way and the excuse.
        this.theo.face(exit.walkTo.x - this.theo.x);
        playSfx('locked');
        await this.sayTheo(exit.lockedComment ?? "I can't go that way yet.");
        return;
      }
      await this.moveParty(exit.walkTo);
      await this.unlockWithKey(exit);
      this.hints.stop();
      this.hoverKind = 'default';
      await this.fadeOut();
      const from = this.room.id;
      store.update((s) => {
        s.previousRoom = from;
        s.currentRoom = exit.to;
      });
      this.clearRoom();
      this.room = getRoom(exit.to);
      this.buildRoom();
      const back = findExit(this.room.id, from);
      const spawn = back?.walkTo ?? this.room.restPoint;
      this.theo.setPosition(spawn.x, spawn.y);
      if (this.lucy) {
        // Lucy starts behind Theo relative to the direction they will walk in.
        const dir = Math.sign(this.room.restPoint.x - spawn.x) || 1;
        this.lucy.setPosition(Phaser.Math.Clamp(spawn.x - dir * LUCY_FOLLOW_GAP, 16, 624), spawn.y + LUCY_FOLLOW_DY);
      }
      void this.fade.in(FADE_MS);
      this.busy = false;
      await this.enterRoom(true);
    } finally {
      this.busy = false;
    }
  }

  private fadeOut(): Promise<void> {
    return this.fade.out(FADE_MS);
  }

  // ---------- Presentation helpers used by controllers ----------

  sayTheo(text: string): Promise<void> {
    return this.dialogue.say(text, this.theo.x, this.theo.y - this.theo.sprite.displayHeight, { voice: 'theo' });
  }

  sayLucy(text: string): Promise<void> {
    const who = this.lucy ?? this.theo;
    return this.dialogue.say(text, who.x, who.y - who.sprite.displayHeight, { fill: 0xffe3f0, voice: 'lucy' });
  }

  /** Marks a container as opened. Nothing is drawn for it; the sound and what comes out are the feedback. */
  showContainerOpen(id: string): void {
    this.openedContainers.add(id);
  }

  /** Shows an item rising out of a container and flying to the backpack. */
  async popItem(item: ItemId, x: number, y: number): Promise<void> {
    const img = this.add.image(x, y, `item_${item}`).setDepth(900).setScale(0.5);
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: img, y: y - 30, scale: 1.4, duration: 250, ease: 'Back.easeOut', onComplete: () => resolve() });
    });
    await this.popImage(img);
  }

  private popImage(img: Phaser.GameObjects.Image): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: img,
        x: 40,
        y: SCENE_HEIGHT + 40,
        scale: 0.3,
        alpha: 0.6,
        duration: 320,
        ease: 'Quad.easeIn',
        onComplete: () => {
          img.destroy();
          resolve();
        },
      });
    });
  }

  /** Stops any sparkles still waiting their turn and removes them. */
  private clearGlints(): void {
    for (const { tween, image } of this.glints) {
      tween.stop();
      image.destroy();
    }
    this.glints = [];
    this.roomObjects = this.roomObjects.filter((o) => o.active);
  }

  /**
   * Glints the things the player still needs, each at a random spot on the object so the
   * sparkle never lands in the same place twice. With `speak`, Theo also says a hint.
   */
  private showHints(speak: boolean): void {
    const state = store.get();
    const targets: Rect[] = [];
    for (const [, img] of this.pickupSprites) {
      targets.push({ x: img.x - img.displayWidth / 2, y: img.y - img.displayHeight / 2, w: img.displayWidth, h: img.displayHeight });
    }
    for (const [, zone] of this.hiddenPickups) targets.push(zone);
    if (this.room.id === 'kitchen' && !getFlag(state, FLAGS.breakfastDone)) {
      const b = this.breakfast.ensureState();
      for (const h of this.room.hotspots) {
        if (h.kind === 'container' && b.placements[h.id]?.type === 'item' && !isPickedUp(state, 'kitchen', h.id)) {
          targets.push(h.zone);
        }
      }
    }
    // One sparkle at a time: each target twinkles for a moment, then the next one takes its turn.
    this.clearGlints();
    targets.forEach((t, i) => {
      const inset = 4;
      const x = Phaser.Math.Between(t.x + inset, Math.max(t.x + inset, t.x + t.w - inset));
      const y = Phaser.Math.Between(t.y + inset, Math.max(t.y + inset, t.y + t.h - inset));
      const g = this.add.image(x, y, 'glint').setDepth(950).setScale(0);
      this.roomObjects.push(g);
      const tw = this.tweens.add({
        targets: g,
        scale: 1.3,
        angle: 90,
        duration: 300,
        yoyo: true,
        repeat: 1,
        delay: i * GLINT_STAGGER_MS,
        onComplete: () => g.destroy(),
      });
      this.glints.push({ tween: tw, image: g });
    });
    if (!speak) return;
    const line = hintLine(this.room, state);
    if (line && !this.busy) void this.sayTheo(line);
  }
}
