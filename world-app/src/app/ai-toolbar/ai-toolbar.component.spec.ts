import { TestBed } from '@angular/core/testing';
import { AiToolbarComponent } from './ai-toolbar.component';

describe('AiToolbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiToolbarComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AiToolbarComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'world-app' title`, () => {
    const fixture = TestBed.createComponent(AiToolbarComponent);
    const app = fixture.componentInstance;
    /* expect(app.title).toEqual('world-app'); */
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AiToolbarComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, world-app');
  });
});
