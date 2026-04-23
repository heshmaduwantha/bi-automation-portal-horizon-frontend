import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PowerbiService, PowerBIReport } from '../../services/powerbi.service';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.css'
})
export class ReportListComponent implements OnInit {
  reports: PowerBIReport[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private powerbiService: PowerbiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.powerbiService.getReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load reports. Make sure the backend is running.';
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Connection Error', detail: 'Could not fetch Power BI reports.' });
      }
    });
  }

  onRefresh(datasetId: string): void {
    this.powerbiService.triggerRefresh(datasetId).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Refresh Triggered', detail: res.message });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Refresh Failed', detail: 'API call unsuccessful.' });
      }
    });
  }

  openReport(url: string): void {
    window.open(url, '_blank');
  }
}
