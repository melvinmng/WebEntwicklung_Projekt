import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiToolbarComponent } from './ai-toolbar.component';

describe('AiToolbarComponent', () => {
  let component: AiToolbarComponent;
  let fixture: ComponentFixture<AiToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
