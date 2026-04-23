import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer>
      <div class="footer-container">
        <p>COPYRIGHT©2025 A product of Horizon Business Solutions – Powered by MIS Team</p>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      background-color: white;
      border-top: 1px solid #f1f5f9;
      padding: 10px 40px;
      margin-top: auto;
    }
    .footer-container {
      display: flex;
      justify-content: center;
    }
    p {
      font-size: 0.7rem;
      color: #94a3b8;
      margin: 0;
      font-weight: 500;
    }
  `]
})
export class FooterComponent {}
