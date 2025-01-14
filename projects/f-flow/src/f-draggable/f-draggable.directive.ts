import {
  AfterViewInit, ContentChildren,
  Directive,
  ElementRef,
  EventEmitter, Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit, Optional, Output, QueryList
} from "@angular/core";
import { F_DRAGGABLE, FDraggableBase } from './f-draggable-base';
import { FComponentsStore } from '../f-storage';
import { FDraggableDataContext } from './f-draggable-data-context';
import { Subscription } from 'rxjs';
import { IPoint, IPointerEvent, Point } from '@foblex/core';
import { NodeMoveFinalizeRequest, NodeMovePreparationRequest } from './node';
import { CanvasMoveFinalizeRequest, CanvasMovePreparationRequest } from './canvas';
import {
  FCreateConnectionEvent,
  FReassignConnectionEvent,
  ReassignConnectionPreparationRequest,
  ReassignConnectionFinalizeRequest,
  CreateConnectionPreparationRequest,
  CreateConnectionFinalizeRequest
} from './connections';
import { FSelectionChangeEvent } from './f-selection-change-event';
import { FFlowMediator } from '../infrastructure';
import { EmitTransformChangesRequest, GetSelectionRequest } from '../domain';
import {
  ExternalItemFinalizeRequest,
  ExternalItemPreparationRequest,
  FCreateNodeEvent,
  isExternalItem
} from '../f-external-item';
import { SingleSelectRequest } from './single-select';
import { NodeResizeFinalizeRequest, NodeResizePreparationRequest } from './node-resize';
import { ICanRunOutsideAngular } from './i-can-run-outside-angular';
import { F_DRAG_AND_DROP_PLUGIN, IFDragAndDropPlugin } from './i-f-drag-and-drop-plugin';
import { BrowserService } from '@foblex/platform';

@Directive({
  selector: "f-flow[fDraggable]",
  exportAs: 'fDraggable',
  providers: [
    { provide: F_DRAGGABLE, useExisting: FDraggableDirective }
  ]
})
export class FDraggableDirective extends FDraggableBase implements OnInit, AfterViewInit, OnDestroy {

  private subscriptions$: Subscription = new Subscription();

  @Input('fDraggableDisabled')
  public override disabled: boolean = false;

  public override get hostElement(): HTMLElement {
    return this.elementReference.nativeElement;
  }

  @Output()
  public override fSelectionChange: EventEmitter<FSelectionChangeEvent> = new EventEmitter<FSelectionChangeEvent>();

  // @Output()
  // public override fConnectionIntersectNode: EventEmitter<ConnectionIntersectNodeEvent> = new EventEmitter<ConnectionIntersectNodeEvent>();

  @Output()
  public override fCreateNode: EventEmitter<FCreateNodeEvent> = new EventEmitter<FCreateNodeEvent>();

  @Output()
  public override fReassignConnection: EventEmitter<FReassignConnectionEvent> = new EventEmitter<FReassignConnectionEvent>();

  @Output()
  public override fCreateConnection: EventEmitter<FCreateConnectionEvent> = new EventEmitter<FCreateConnectionEvent>();

  @ContentChildren(F_DRAG_AND_DROP_PLUGIN, { descendants: true })
  private plugins!: QueryList<IFDragAndDropPlugin>;

  constructor(
    private elementReference: ElementRef<HTMLElement>,
    private fDraggableDataContext: FDraggableDataContext,
    @Inject(NgZone) @Optional() ngZone: ICanRunOutsideAngular,
    private fComponentsStore: FComponentsStore,
    private fMediator: FFlowMediator,
    private fBrowser: BrowserService,
  ) {
    super(ngZone);
  }

  public ngOnInit(): void {
    this.fComponentsStore.fDraggable = this;
  }

  public ngAfterViewInit(): void {
    super.subscribe(this.fBrowser.document);
  }

  public override onPointerDown(event: IPointerEvent): boolean {
    this.fDraggableDataContext.reset();
    let result: boolean = event.isMouseLeftButton();

    this.plugins.forEach((p) => {
      p.onPointerDown?.(event);
    });

    this.fMediator.send<void>(new SingleSelectRequest(event));

    this.fMediator.send<void>(new ReassignConnectionPreparationRequest(event));

    this.fMediator.send<void>(new CreateConnectionPreparationRequest(event));

    if (!result) {
      this.finalizeDragSequence();
    }
    return result;
  }

  protected override prepareDragSequence(event: IPointerEvent) {

    this.plugins.forEach((p) => {
      p.prepareDragSequence?.(event);
    });

    this.fMediator.send<void>(new NodeResizePreparationRequest(event));

    this.fMediator.send<void>(new NodeMovePreparationRequest(event));

    this.fMediator.send<void>(new CanvasMovePreparationRequest(event));

    this.fMediator.send<void>(new ExternalItemPreparationRequest(event));

    this.fDraggableDataContext.draggableItems.forEach((item) => {
      item.initialize?.();
    });

    if (this.fDraggableDataContext.draggableItems.length > 0) {
      this.hostElement.classList.add('f-dragging');
      this.emitSelectionChangeEvent();
    }
  }

  protected override onSelect(event: Event): void {

    this.plugins.forEach((p) => {
      p.onSelect?.(event);
    });

    if (this.isTargetItemExternal(event)) {
      event.preventDefault();
    }
  }

  private isTargetItemExternal(event: Event): boolean {
    let isTargetItemExternal = this.isExternalItem(event.target as HTMLElement);
    let isTargetParentItemExternal = this.isExternalItem((event.target as Node).parentNode as HTMLElement);
    return isTargetItemExternal || isTargetParentItemExternal;
  }

  private isExternalItem(target: HTMLElement): boolean {
    let result = false;
    try {
      result = isExternalItem(target);
    } catch (e) {
    }
    return result;
  }

  public override onPointerMove(event: IPointerEvent): void {
    const pointerPositionInCanvas = Point.fromPoint(event.getPosition()).elementTransform(this.hostElement);
    const difference: IPoint = pointerPositionInCanvas.div(this.fDraggableDataContext.onPointerDownScale).sub(this.fDraggableDataContext.onPointerDownPosition);
    this.fDraggableDataContext.draggableItems.forEach((item) => {
      item.move({ ...difference });
    });
  }

  public override onPointerUp(event: IPointerEvent): void {

    this.plugins.forEach((p) => {
      p.onPointerUp?.(event);
    });

    this.fMediator.send<void>(new ReassignConnectionFinalizeRequest(event));

    this.fMediator.send<void>(new CreateConnectionFinalizeRequest(event));

    this.fMediator.send<void>(new NodeResizeFinalizeRequest(event));

    this.fMediator.send<void>(new NodeMoveFinalizeRequest(event));

    this.fMediator.send<void>(new CanvasMoveFinalizeRequest(event));

    this.fMediator.send<void>(new ExternalItemFinalizeRequest(event));

    this.hostElement.classList.remove('f-dragging');

    this.fDraggableDataContext.reset();
  }

  protected override finalizeDragSequence(): void {
    this.emitSelectionChangeEvent();
  }

  private emitSelectionChangeEvent(): void {
    if (
      !this.fDraggableDataContext.isSelectedChanged
    ) {
      return;
    }
    this.fSelectionChange.emit(this.fMediator.send<FSelectionChangeEvent>(new GetSelectionRequest()));
    this.fDraggableDataContext.isSelectedChanged = false;
    this.fMediator.send<void>(new EmitTransformChangesRequest());
  }

  public ngOnDestroy(): void {
    super.unsubscribe();
    this.subscriptions$.unsubscribe();
  }
}

