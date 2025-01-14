import {
  EventExtensions,
  IHasHostElement,
  IMouseEvent,
  IPoint,
  IPointerEvent,
  ITouchDownEvent,
  ITouchMoveEvent,
  ITouchUpEvent,
  PointExtensions
} from '@foblex/core';
import { Directive, EventEmitter, InjectionToken, } from '@angular/core';
import { FCreateConnectionEvent, FReassignConnectionEvent } from './connections';
import { FSelectionChangeEvent } from './f-selection-change-event';
import { ICanRunOutsideAngular } from './i-can-run-outside-angular';
import { FCreateNodeEvent } from '../f-external-item';

export const F_DRAGGABLE = new InjectionToken<FDraggableBase>('F_DRAGGABLE');

export const MOUSE_EVENT_IGNORE_TIME = 800;

@Directive()
export abstract class FDraggableBase implements IHasHostElement {

  public abstract hostElement: HTMLElement;

  public abstract fSelectionChange: EventEmitter<FSelectionChangeEvent>;

  public abstract fCreateNode: EventEmitter<FCreateNodeEvent>;

  public abstract fReassignConnection: EventEmitter<FReassignConnectionEvent>;

  public abstract fCreateConnection: EventEmitter<FCreateConnectionEvent>;

  private fDocument: Document | undefined;

  private mouseListeners: Function = EventExtensions.emptyListener();
  private touchListeners: Function = EventExtensions.emptyListener();

  private startListeners: Function = EventExtensions.emptyListener();

  public isSyntheticEvent(event: MouseEvent): boolean {
    return !!this.lastTouchEventTime &&
      (this.lastTouchEventTime + MOUSE_EVENT_IGNORE_TIME > Date.now());
  }

  private lastTouchEventTime: number = 0;

  public isDragStarted: boolean = false;
  private dragStartThreshold: number = 3;
  private dragStartDelay: number = 0;

  private dragStartTime: number = 0;
  private dragStartPosition: IPoint = PointExtensions.initialize();

  public abstract disabled: boolean;

  private moveHandler: Function = this.checkDragSequenceToStart;

  private pointerDownElement: HTMLElement | null = null;

  protected constructor(
    protected ngZone: ICanRunOutsideAngular | undefined
  ) {
  }

  private onMouseDown = (event: MouseEvent) => {
    const isSyntheticEvent = this.isSyntheticEvent(event);
    const isFakeEvent = isFakeMousedownFromScreenReader(event);
    const mouseEvent = new IMouseEvent(event);
    this.pointerDownElement = mouseEvent.targetElement;

    if (isSyntheticEvent || isFakeEvent || this.disabled) {
      return;
    }
    let result = this.onPointerDown(mouseEvent);
    if (result) {

      this.dragStartTime = Date.now();
      this.dragStartPosition = mouseEvent.getPosition();

      this.ngZone?.runOutsideAngular(() => {
        this.fDocument?.addEventListener('selectstart', this.onSelectStart, EventExtensions.activeListener());
        this.fDocument?.addEventListener('mousemove', this.onMouseMove);
        this.fDocument?.addEventListener('mouseup', this.onMouseUp);
      });

      this.mouseListeners = () => {
        this.fDocument?.removeEventListener('selectstart', this.onSelectStart, EventExtensions.activeListener());
        this.fDocument?.removeEventListener('mousemove', this.onMouseMove);
        this.fDocument?.removeEventListener('mouseup', this.onMouseUp);
      };
    }
  }

  private onTouchDown = (event: TouchEvent) => {
    const isFakeEvent = isFakeTouchstartFromScreenReader(event as TouchEvent)
    const touchEvent = new ITouchDownEvent(event);
    this.pointerDownElement = touchEvent.targetElement;

    if (isFakeEvent || this.disabled) {
      return;
    }
    let result = this.onPointerDown(touchEvent);
    if (result) {

      this.dragStartTime = Date.now();
      this.dragStartPosition = touchEvent.getPosition();

      this.ngZone?.runOutsideAngular(() => {
        this.fDocument?.addEventListener('selectstart', this.onSelectStart, EventExtensions.activeListener());
        this.fDocument?.addEventListener('touchmove', this.onTouchMove);
        this.fDocument?.addEventListener('touchend', this.onTouchUp);
      });

      this.touchListeners = () => {
        this.fDocument?.removeEventListener('selectstart', this.onSelectStart, EventExtensions.activeListener());
        this.fDocument?.removeEventListener('touchmove', this.onTouchMove);
        this.fDocument?.removeEventListener('touchend', this.onTouchUp);
      };
    }
  }

  private onSelectStart = (event: Event) => {
    this.onSelect(event);
  }

  private onMouseMove = (event: MouseEvent) => {
    this.moveHandler(new IMouseEvent(event));
  }

  private onTouchMove = (event: TouchEvent) => {
    this.moveHandler(new ITouchMoveEvent(event));
  }

  private checkDragSequenceToStart(event: IPointerEvent): void {
    const pointerPosition = event.getPosition();

    if (!this.isDragStarted && this.pointerDownElement) {
      event.setTarget(this.pointerDownElement);
      const distanceX = Math.abs(pointerPosition.x - this.dragStartPosition.x);
      const distanceY = Math.abs(pointerPosition.y - this.dragStartPosition.y);
      const isOverThreshold = distanceX + distanceY >= this.dragStartThreshold;

      if (isOverThreshold) {
        const isDelayElapsed = Date.now() >= this.dragStartTime + this.dragStartDelay;

        if (!isDelayElapsed) {
          this.endDragSequence();
          return;
        }

        event.preventDefault();
        this.prepareDragSequence(event);
        this.isDragStarted = true;
        this.moveHandler = this.onPointerMove;
        if (isTouchEvent(event.originalEvent)) {
          this.lastTouchEventTime = Date.now();
        }
      }
    }
  }

  protected abstract prepareDragSequence(event: IPointerEvent): void;

  private onMouseUp = (event: MouseEvent) => {
    if (this.isDragStarted) {
      this.onPointerUp(new IMouseEvent(event));
    }
    this.endDragSequence();
  }

  private onTouchUp = (event: TouchEvent) => {
    if (this.isDragStarted) {
      this.onPointerUp(new ITouchUpEvent(event));
    }
    this.endDragSequence();
  }

  private endDragSequence(): void {
    this.isDragStarted = false;
    this.pointerDownElement = null;

    this.moveHandler = this.checkDragSequenceToStart;
    this.mouseListeners();
    this.mouseListeners = EventExtensions.emptyListener();
    this.touchListeners();
    this.touchListeners = EventExtensions.emptyListener();
    this.finalizeDragSequence();
  }

  protected abstract finalizeDragSequence(): void;

  protected abstract onSelect(event: Event): void;

  public abstract onPointerDown(event: IPointerEvent): boolean;

  public abstract onPointerMove(event: IPointerEvent): void;

  public abstract onPointerUp(event: IPointerEvent): void;

  public subscribe(fDocument: Document): void {
    if (this.fDocument) {
      this.unsubscribe();
    }
    this.fDocument = fDocument;

    this.ngZone?.runOutsideAngular(() => {
      fDocument.addEventListener('mousedown', this.onMouseDown, EventExtensions.activeListener());
      fDocument.addEventListener('touchstart', this.onTouchDown, EventExtensions.passiveListener());
    });

    this.startListeners = () => {
      fDocument.removeEventListener('mousedown', this.onMouseDown, EventExtensions.activeListener());
      fDocument.removeEventListener('touchstart', this.onTouchDown, EventExtensions.passiveListener());
    };
  }

  public unsubscribe(): void {

    this.startListeners();
    this.startListeners = EventExtensions.emptyListener();
    this.touchListeners();
    this.touchListeners = EventExtensions.emptyListener();
    this.mouseListeners();
    this.mouseListeners = EventExtensions.emptyListener();
  }
}

function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
  return event.type[ 0 ] === 't';
}

function isFakeMousedownFromScreenReader(event: MouseEvent): boolean {
  return event.buttons === 0 || (event.offsetX === 0 && event.offsetY === 0);
}

function isFakeTouchstartFromScreenReader(event: TouchEvent): boolean {
  const touch: Touch | undefined =
    (event.touches && event.touches[ 0 ]) || (event.changedTouches && event.changedTouches[ 0 ]);
  return (
    !!touch &&
    touch.identifier === -1 &&
    (touch.radiusX == null || touch.radiusX === 1) &&
    (touch.radiusY == null || touch.radiusY === 1)
  );
}
