import { ISize, ITransformModel } from '@foblex/core';
import { LineElement } from './line-element';
import { BrowserService } from '@foblex/platform';

export class LineService {

  private fHorizontalLine: LineElement;
  private fVerticalLine: LineElement;

  constructor(fBrowser: BrowserService, private hostElement: HTMLElement) {
    this.fHorizontalLine = new LineElement(fBrowser, this.hostElement);
    this.fVerticalLine = new LineElement(fBrowser, this.hostElement);
    this.fHorizontalLine.hide();
    this.fVerticalLine.hide();
  }

  public drawVerticalLine(x: number, size: ISize, transform: ITransformModel): void {
    this.fVerticalLine.show();
    this.fVerticalLine.draw({
      left: x * transform.scale + transform.position.x + transform.scaledPosition.x,
      top: 0,
      width: 1,
      height: size.height
    });
  }

  public drawHorizontalLine(y: number, size: ISize, transform: ITransformModel): void {
    this.fHorizontalLine.show();
    this.fHorizontalLine.draw({
      left: 0,
      top: y * transform.scale + transform.position.y + transform.scaledPosition.y,
      width: size.width,
      height: 1
    });
  }

  public hideVerticalLine(): void {
    this.fVerticalLine.hide();
  }

  public hideHorizontalLine(): void {
    this.fHorizontalLine.hide();
  }
}
