import {
  ChangeDetectionStrategy,
  Component, ContentChildren,
  ElementRef,
  Input,
  OnDestroy,
  OnInit, QueryList,
  ViewChild
} from "@angular/core";
import {
  CONNECTION_GRADIENT,
  CONNECTION_PATH,
  CONNECTION_TEXT,
  FConnectionDragHandleComponent,
  FConnectionSelectionComponent,
  IConnectionGradient,
  IConnectionPath, IConnectionText,
} from '../common';
import { EFConnectionBehavior } from '../common';
import { EFConnectionType } from '../common';
import { FComponentsStore } from '../../f-storage';
import { FMarkerBase } from '../f-marker';
import { FConnectionCenterDirective } from '../f-connection-center';
import { FConnectionFactory } from '../f-connection-builder';
import { castToEnum } from '../../domain';
import { F_CONNECTION } from '../common/f-connection.injection-token';
//TODO: Need to deal with cyclic dependencies, since in some cases an error occurs when importing them ../common
// TypeError: Class extends value undefined is not a constructor or null
// at f-connection-for-create.component.ts:34:11
import { FConnectionBase } from '../common/f-connection-base';

let uniqueId: number = 0;

@Component({
  selector: "f-connection",
  exportAs: 'fComponent',
  templateUrl: "./f-connection.component.html",
  styleUrls: [ "./f-connection.component.scss" ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.id]': 'fId',
    class: "f-component f-connection",
    '[class.f-connection-selection-disabled]': 'fSelectionDisabled',
    '[class.f-connection-reassign-disabled]': 'fDraggingDisabled',
  },
  providers: [ { provide: F_CONNECTION, useExisting: FConnectionComponent } ],
})
export class FConnectionComponent
    extends FConnectionBase implements OnInit, OnDestroy {

  @Input('fConnectionId')
  public override fId: string = `f-connection-${ uniqueId++ }`;

  private _fText: string = '';
  @Input()
  public override set fText(value: string) {
    this._fText = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fText(): string {
    return this._fText;
  }

  private _fStartColor: string = 'black';
  @Input()
  public override set fStartColor(value: string) {
    this._fStartColor = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fStartColor(): string {
    return this._fStartColor;
  }

  private _fEndColor: string = 'black';
  @Input()
  public override set fEndColor(value: string) {
    this._fEndColor = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fEndColor(): string {
    return this._fEndColor;
  }

  private _fOutputId!: string;
  @Input()
  public override set fOutputId(value: string) {
    this._fOutputId = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fOutputId(): string {
    return this._fOutputId;
  }

  private _fInputId!: string;
  @Input()
  public override set fInputId(value: string) {
    this._fInputId = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fInputId(): string {
    return this._fInputId;
  }

  private _fRadius: number = 8;
  @Input()
  public override set fRadius(value: number) {
    this._fRadius = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fRadius(): number {
    return this._fRadius;
  }

  private _fOffset: number = 32;
  @Input()
  public override set fOffset(value: number) {
    this._fOffset = value;
    this.fComponentsStore.componentDataChanged();
  }
  public override get fOffset(): number {
    return this._fOffset;
  }

  private _behavior: EFConnectionBehavior = EFConnectionBehavior.FIXED;
  @Input()
  public override set fBehavior(value: string | EFConnectionBehavior) {
    this._behavior = castToEnum(value, 'fBehavior', EFConnectionBehavior);
    this.fComponentsStore.componentDataChanged();
  }
  public override get fBehavior(): EFConnectionBehavior {
    return this._behavior;
  }

  private _type: EFConnectionType = EFConnectionType.STRAIGHT;
  @Input()
  public override set fType(value: EFConnectionType | string) {
    this._type = value as unknown as EFConnectionType; //castToEnum(value, 'fType', EFConnectionType);
    this.fComponentsStore.componentDataChanged();
  }
  public override get fType(): EFConnectionType {
    return this._type;
  }

  @Input('fReassignDisabled')
  public override fDraggingDisabled: boolean = false;

  @Input()
  public override fSelectionDisabled: boolean = false;

  @ViewChild('defs', { static: true })
  public override fDefs!: ElementRef<SVGDefsElement>;

  public get fMarkers(): FMarkerBase[] {
    return this.fComponentsStore.fMarkers.filter((x) => {
      return this.hostElement.contains(x.hostElement);
    })
  }

  @ViewChild(CONNECTION_PATH, { static: true })
  public override fPath!: IConnectionPath;

  @ViewChild(CONNECTION_GRADIENT, { static: true })
  public override fGradient!: IConnectionGradient;

  @ViewChild(FConnectionDragHandleComponent, { static: true })
  public override fDragHandle!: FConnectionDragHandleComponent;

  @ViewChild(FConnectionSelectionComponent, { static: true })
  public override fSelection!: FConnectionSelectionComponent;

  @ViewChild(CONNECTION_TEXT, { static: true })
  public override fTextComponent!: IConnectionText;

  @ViewChild('fConnectionCenter', { static: false })
  public override fConnectionCenter!: ElementRef<HTMLDivElement>;

  @ContentChildren(FConnectionCenterDirective, { descendants: true })
  public fConnectionCenters!: QueryList<FConnectionCenterDirective>;
  public override get boundingElement(): HTMLElement | SVGElement {
    return this.fPath.hostElement;
  }

  constructor(
      elementReference: ElementRef<HTMLElement>,
      fConnectionFactory: FConnectionFactory,
      private fComponentsStore: FComponentsStore
  ) {
    super(elementReference, fConnectionFactory);
  }

  public ngOnInit(): void {
    this.fComponentsStore.addComponent(this.fComponentsStore.fConnections, this);
  }

  public ngOnDestroy(): void {
    this.fComponentsStore.removeComponent(this.fComponentsStore.fConnections, this);
  }
}
