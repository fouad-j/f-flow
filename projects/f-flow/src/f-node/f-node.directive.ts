import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from "@angular/core";
import { IHasHostElement, IPoint, IRect, ISize, PointExtensions } from '@foblex/core';
import { BrowserService } from '@foblex/platform';
import { merge, Subscription } from 'rxjs';
import { startWith, debounceTime } from 'rxjs/operators';
import { FResizeObserver } from './f-resize-observer';
import { FComponentsStore } from '../f-storage';
import {
  CalculateConnectorConnectableSideHandler,
  CalculateConnectorConnectableSideRequest,
  FConnectorBase
} from '../f-connectors';
import { FFlowMediator } from '../infrastructure';
import { EmitTransformChangesRequest } from '../domain';
import { F_NODE, FNodeBase } from './f-node-base';

let uniqueId: number = 0;

@Directive({
  selector: "[fNode]",
  exportAs: "fComponent",
  host: {
    '[attr.data-f-node-id]': 'fId',
    class: "f-node f-component",
    '[class.f-node-dragging-disabled]': 'fDraggingDisabled',
    '[class.f-node-selection-disabled]': 'fSelectionDisabled',
  },
  providers: [
    { provide: F_NODE, useExisting: FNodeDirective }
  ],
})
export class FNodeDirective extends FNodeBase implements OnInit, AfterViewInit, IHasHostElement, OnDestroy {

  private subscriptions$: Subscription = new Subscription();

  @Input('fNodeId')
  public override fId: string = `f-node-${ uniqueId++ }`;

  @Input('fNodeParentId')
  public override fParentId: string | null | undefined = null;

  @Input('fNodePosition')
  public override set position(value: IPoint) {
    this._position = PointExtensions.castToPoint(value);
    this.refresh();
  }

  public override get position(): IPoint {
    return this._position;
  }

  @Output('fNodePositionChange')
  public override positionChange: EventEmitter<IPoint> = new EventEmitter<IPoint>();

  @Input('fNodeSize')
  public override set size(value: ISize) {
    this._size = value;
    this.refresh();
  }

  public override get size(): ISize {
    return this._size!;
  }

  @Output('fNodeSizeChange')
  public override sizeChange: EventEmitter<IRect> = new EventEmitter<IRect>();

  @Input('fNodeDraggingDisabled')
  public override fDraggingDisabled: boolean = false;

  @Input('fNodeSelectionDisabled')
  public override fSelectionDisabled: boolean = false;

  @Input()
  public override fIncludePadding: boolean = true;

  //TODO: Add ability to connect to first connectable input if node is under pointer
  @Input()
  public override fConnectOnNode: boolean = true;

  public get hostElement(): HTMLElement {
    return this.elementReference.nativeElement;
  }

  public override connectors: FConnectorBase[] = [];

  constructor(
    private elementReference: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private fComponentsStore: FComponentsStore,
    private fMediator: FFlowMediator,
    private fBrowser: BrowserService
  ) {
    super();
  }

  public ngOnInit(): void {
    this.setStyle('position', 'absolute');
    this.setStyle('transform-origin', 'center');
    this.setStyle('user-select', 'none');
    this.setStyle('pointer-events', 'all');
    this.setStyle('left', '0');
    this.setStyle('top', '0');
    super.redraw();
    this.fComponentsStore.addComponent(this.fComponentsStore.fNodes, this);
  }

  protected override setStyle(styleName: string, value: string) {
    this.renderer.setStyle(this.hostElement, styleName, value);
  }

  public override redraw(): void {
    super.redraw();
    this.fMediator.send(new EmitTransformChangesRequest());
  }

  public ngAfterViewInit(): void {
    if(!this.fBrowser.isBrowser()) {
      return;
    }
    this.subscriptions$.add(
      this.subscribeOnResizeChanges()
    );
  }

  private subscribeOnResizeChanges(): Subscription {
    return merge(new FResizeObserver(this.hostElement as HTMLElement), this.stateChanges).pipe(
      debounceTime(10), startWith(null)
    ).subscribe(() => {
      this.connectors.forEach((fConnector: FConnectorBase) => {
        fConnector.fConnectableSide = new CalculateConnectorConnectableSideHandler().handle(
          new CalculateConnectorConnectableSideRequest(fConnector, this.hostElement)
        );
      });
      this.fComponentsStore.componentDataChanged();
    });
  }

  public override addConnector(connector: FConnectorBase): void {
    this.connectors.push(connector);
    this.stateChanges.next();
  }

  public override removeConnector(connector: FConnectorBase): void {
    const index = this.connectors.indexOf(connector);
    if (index !== -1) {
      this.connectors.splice(index, 1);
    }
    this.stateChanges.next();
  }

  public refresh(): void {
    this.stateChanges.next();
  }

  public ngOnDestroy(): void {
    this.fComponentsStore.removeComponent(this.fComponentsStore.fNodes, this);
    this.stateChanges.complete();
    this.subscriptions$.unsubscribe();
  }
}
